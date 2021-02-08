'use strict';

const assert = require('assert');

const sinon = require('sinon');
const mockRequire = require('mock-require');

const Settings = require('@janiscommerce/settings');
const MongodbIndexCreator = require('../lib/mongodb-index-creator');
const { Client, Results } = require('../lib/helpers');

const ClientModel = require('./models/client/client');
const SimpleModel = require('./models/client/simple');
const CompleteModel = require('./models/client/complete');
const EmptyModel = require('./models/client/empty');

const SimpleReadModel = require('./models/client/simple-read');
const SimpleCoreModel = require('./models/core/simple');

const mockModel = require('./models/mock-model');

const defaultIndex = require('./default-index');

require('../lib/colorful-lllog')('none');

const fakeDBSettings = {
	core: { write: {} }
};

describe('MongodbIndexCreator - Client Indexes', () => {

	beforeEach(() => {
		sinon.stub(Settings, 'get')
			.returns(fakeDBSettings);
	});

	afterEach(() => {
		sinon.restore();
		mockRequire.stopAll();
		Results.results = null;
	});

	const loadClient = (addRead = false) => {

		mockRequire(Client.getRelativePath(), ClientModel);

		sinon.stub(ClientModel.prototype, 'getIndexes')
			.resolves([defaultIndex]);

		sinon.stub(ClientModel.prototype, 'dropIndexes')
			.resolves(true);

		sinon.stub(ClientModel.prototype, 'createIndexes')
			.resolves(true);

		sinon.stub(ClientModel.prototype, 'get')
			.resolves([{
				code: 'the-client-code',
				databases: {
					default: {
						write: {},
						...addRead ? { read: {} } : {}
					}
				}
			}]);
	};

	const execute = () => {
		const mongodbIndexCreator = new MongodbIndexCreator();
		return mongodbIndexCreator.executeForClientDatabases();
	};

	const executeForCode = code => {
		const mongodbIndexCreator = new MongodbIndexCreator();
		return mongodbIndexCreator.executeForClientCode(code);
	};

	context('when valid indexes found in models', () => {

		it('shouldn\'t create or drop any indexes if no index in model and collection', async () => {

			loadClient();

			mockModel(sinon, { 'empty.js': EmptyModel });

			sinon.stub(EmptyModel.prototype, 'getIndexes')
				.resolves([defaultIndex]);

			sinon.stub(EmptyModel.prototype, 'dropIndexes')
				.resolves(true);

			sinon.stub(EmptyModel.prototype, 'createIndexes')
				.resolves(true);

			await execute();

			sinon.assert.notCalled(EmptyModel.prototype.dropIndexes);
			sinon.assert.notCalled(EmptyModel.prototype.createIndexes);
		});

		it('shouldn\'t create or drop any indexes if no changes in indexes', async () => {

			loadClient();

			mockModel(sinon, { 'simple.js': SimpleModel });

			sinon.stub(SimpleModel.prototype, 'getIndexes')
				.resolves([defaultIndex, {
					name: 'field',
					key: { field: 1 }
				}]);

			sinon.stub(SimpleModel.prototype, 'dropIndexes')
				.resolves(true);

			sinon.stub(SimpleModel.prototype, 'createIndexes')
				.resolves(true);

			await execute();

			sinon.assert.notCalled(SimpleModel.prototype.dropIndexes);
			sinon.assert.notCalled(SimpleModel.prototype.createIndexes);
		});

		it('should create a client index and save results', async () => {

			sinon.restore();

			sinon.stub(Settings, 'get')
				.returns(false);

			loadClient();

			mockModel(sinon, { 'simple.js': SimpleModel });

			sinon.stub(SimpleModel.prototype, 'getIndexes')
				.resolves([defaultIndex]);

			sinon.stub(SimpleModel.prototype, 'dropIndexes')
				.resolves(true);

			sinon.stub(SimpleModel.prototype, 'createIndexes')
				.resolves(true);

			await execute();

			sinon.assert.notCalled(SimpleModel.prototype.dropIndexes);

			sinon.assert.calledOnceWithExactly(SimpleModel.prototype.createIndexes, [{
				name: 'field',
				key: { field: 1 }
			}]);

			assert.deepStrictEqual(Results.results, {
				'the-client-code': {
					[SimpleModel.prototype.databaseKey]: {
						write: {
							[SimpleModel.table]: {
								created: ['field']
							}
						}
					}
				}
			});
		});

		it('should create and drop index if found the index but changes and save results', async () => {

			loadClient();

			mockModel(sinon, { 'simple.js': SimpleModel });

			sinon.stub(SimpleModel.prototype, 'getIndexes')
				.resolves([defaultIndex, {
					name: 'field',
					key: { field: 1 },
					unique: true
				}]);

			sinon.stub(SimpleModel.prototype, 'dropIndexes')
				.resolves(true);

			sinon.stub(SimpleModel.prototype, 'createIndexes')
				.resolves(true);

			await execute();

			sinon.assert.calledOnceWithExactly(SimpleModel.prototype.dropIndexes, ['field']);

			sinon.assert.calledOnceWithExactly(SimpleModel.prototype.createIndexes, [{
				name: 'field',
				key: { field: 1 }
			}]);

			assert.deepStrictEqual(Results.results, {
				'the-client-code': {
					[SimpleModel.prototype.databaseKey]: {
						write: {
							[SimpleModel.table]: {
								created: ['field'],
								dropped: ['field']
							}
						}
					}
				}
			});
		});

		it('should drop a client index', async () => {

			loadClient();

			mockModel(sinon, { 'empty.js': EmptyModel });

			sinon.stub(EmptyModel.prototype, 'getIndexes')
				.resolves([defaultIndex, {
					name: 'oldIndex',
					key: { oldIndex: 1 }
				}]);

			sinon.stub(EmptyModel.prototype, 'dropIndexes')
				.resolves(true);

			sinon.stub(EmptyModel.prototype, 'createIndexes')
				.resolves(true);

			await execute();

			sinon.assert.calledOnceWithExactly(EmptyModel.prototype.dropIndexes, ['oldIndex']);

			sinon.assert.notCalled(EmptyModel.prototype.createIndexes);
		});

		it('should create and drop client indexes', async () => {

			loadClient();

			mockModel(sinon, { 'simple.js': SimpleModel });

			sinon.stub(SimpleModel.prototype, 'getIndexes')
				.resolves([defaultIndex, {
					name: 'oldIndex',
					key: { oldIndex: 1 }
				}]);

			sinon.stub(SimpleModel.prototype, 'dropIndexes')
				.resolves(true);

			sinon.stub(SimpleModel.prototype, 'createIndexes')
				.resolves(true);

			await execute();

			sinon.assert.calledOnceWithExactly(SimpleModel.prototype.dropIndexes, ['oldIndex']);

			sinon.assert.calledOnceWithExactly(SimpleModel.prototype.createIndexes, [{
				name: 'field',
				key: { field: 1 }
			}]);

		});

		it('should process only for client when is executed with executeForClientCode(code)', async () => {

			loadClient();

			mockModel(sinon, { 'simple.js': SimpleModel, 'core-simple.js': SimpleCoreModel });

			sinon.stub(SimpleModel.prototype, 'getIndexes')
				.resolves([defaultIndex]);

			sinon.spy(SimpleModel.prototype, 'dropIndexes');

			sinon.stub(SimpleModel.prototype, 'createIndexes')
				.resolves(true);

			sinon.spy(SimpleCoreModel.prototype, 'getIndexes');

			sinon.spy(SimpleCoreModel.prototype, 'dropIndexes');

			sinon.spy(SimpleCoreModel.prototype, 'createIndexes');

			await executeForCode('the-client-code');

			sinon.assert.notCalled(SimpleModel.prototype.dropIndexes);

			sinon.assert.calledOnceWithExactly(SimpleModel.prototype.createIndexes, [{
				name: 'field',
				key: { field: 1 }
			}]);

			sinon.assert.notCalled(SimpleCoreModel.prototype.getIndexes);
			sinon.assert.notCalled(SimpleCoreModel.prototype.createIndexes);
			sinon.assert.notCalled(SimpleCoreModel.prototype.dropIndexes);

		});

		context('when model has read db', () => {

			it('should create a client index when write and read databases present', async () => {

				loadClient(true);

				mockModel(sinon, { 'simple.js': SimpleReadModel });

				sinon.stub(SimpleReadModel.prototype, 'getIndexes')
					.resolves([defaultIndex]);

				sinon.stub(SimpleReadModel.prototype, 'dropIndexes')
					.resolves(true);

				sinon.stub(SimpleReadModel.prototype, 'createIndexes')
					.resolves(true);

				await execute();

				sinon.assert.notCalled(SimpleReadModel.prototype.dropIndexes);

				sinon.assert.calledTwice(SimpleReadModel.prototype.createIndexes);

				sinon.assert.calledWithExactly(SimpleReadModel.prototype.createIndexes, [{
					name: 'field',
					key: { field: 1 }
				}]);
			});

			it('should create and drop client indexex for read database', async () => {

				loadClient(true);

				mockModel(sinon, { 'simple.js': SimpleReadModel });

				sinon.stub(SimpleReadModel.prototype, 'getIndexes')
					.onCall(0) // for write
					.resolves([defaultIndex, {
						name: 'field',
						key: { field: 1 }
					}])
					.onCall(1) // for read
					.resolves([defaultIndex, {
						name: 'wrongField',
						key: { wrongField: 1 }
					}]);

				sinon.stub(SimpleReadModel.prototype, 'dropIndexes')
					.rejects('dropping error message');

				sinon.stub(SimpleReadModel.prototype, 'createIndexes')
					.resolves(true);

				await execute();

				// se dropea para la base read
				sinon.assert.calledOnceWithExactly(SimpleReadModel.prototype.dropIndexes, ['wrongField']);

				// se crea para la base read
				sinon.assert.calledOnceWithExactly(SimpleReadModel.prototype.createIndexes, [{
					name: 'field',
					key: { field: 1 }
				}]);

				assert.deepStrictEqual(Results.results, {
					'the-client-code': {
						[SimpleModel.prototype.databaseKey]: {
							read: {
								[SimpleModel.table]: {
									created: ['field'],
									collectionFailed: ['wrongField'] // drop
								}
							}
						}
					}
				});
			});
		});

		context('when createIndexes fails for some indexes', () => {
			it('should log the result and continue without rejecting', async () => {

				loadClient();

				mockModel(sinon, { 'simple.js': SimpleModel, 'complete.js': CompleteModel });

				sinon.stub(SimpleModel.prototype, 'getIndexes')
					.resolves([defaultIndex, {
						name: 'badIndex',
						key: { badIndex: 1 }
					}, {
						name: 'otherBadIndex',
						key: { otherBadIndex: 1 }
					}]);

				sinon.stub(SimpleModel.prototype, 'dropIndexes')
					.resolves(true);

				sinon.stub(SimpleModel.prototype, 'createIndexes')
					.rejects('Some error');

				sinon.stub(CompleteModel.prototype, 'getIndexes')
					.resolves([defaultIndex, {
						name: 'oldIndex',
						key: { oldIndex: 1 }
					}]);

				sinon.stub(CompleteModel.prototype, 'dropIndexes')
					.resolves(true);

				sinon.stub(CompleteModel.prototype, 'createIndexes')
					.resolves(true);

				await execute();

				sinon.assert.calledOnceWithExactly(SimpleModel.prototype.dropIndexes, ['badIndex', 'otherBadIndex']);

				sinon.assert.calledOnceWithExactly(SimpleModel.prototype.createIndexes, [{
					name: 'field',
					key: { field: 1 }
				}]);

				sinon.assert.calledOnceWithExactly(CompleteModel.prototype.dropIndexes, ['oldIndex']);

				sinon.assert.calledOnceWithExactly(CompleteModel.prototype.createIndexes, [{
					name: 'field',
					key: { field: 1 }
				}, {
					name: 'foo_bar_unique',
					key: { foo: 1, bar: 1 },
					unique: true
				}]);

				assert.deepStrictEqual(Results.results, {
					'the-client-code': {
						[SimpleModel.prototype.databaseKey]: {
							write: {
								[SimpleModel.table]: {
									collectionFailed: ['field'],
									dropped: ['badIndex', 'otherBadIndex']
								},
								[CompleteModel.table]: {
									created: ['field', 'foo_bar_unique'],
									dropped: ['oldIndex']
								}
							}
						}
					}
				});
			});
		});

	});

	context('when client not found', () => {
		it('shouldn\'t process indexes', async () => {

			mockRequire(Client.getRelativePath(), ClientModel);

			sinon.stub(ClientModel.prototype, 'get')
				.resolves([]);

			mockModel(sinon, { 'simple.js': SimpleModel });

			sinon.stub(SimpleModel.prototype, 'getIndexes');
			sinon.stub(SimpleModel.prototype, 'dropIndexes');
			sinon.stub(SimpleModel.prototype, 'createIndexes');

			await executeForCode('the-client-code');

			sinon.assert.notCalled(SimpleModel.prototype.getIndexes);
			sinon.assert.notCalled(SimpleModel.prototype.createIndexes);
			sinon.assert.notCalled(SimpleModel.prototype.dropIndexes);
		});
	});

	context('when model client rejects', () => {
		it('shouldn\'t process indexes', async () => {

			mockRequire(Client.getRelativePath(), ClientModel);

			sinon.stub(ClientModel.prototype, 'get')
				.rejects('some error');

			mockModel(sinon, { 'simple.js': SimpleModel });

			sinon.stub(SimpleModel.prototype, 'getIndexes');
			sinon.stub(SimpleModel.prototype, 'dropIndexes');
			sinon.stub(SimpleModel.prototype, 'createIndexes');

			await execute();

			sinon.assert.notCalled(SimpleModel.prototype.getIndexes);
			sinon.assert.notCalled(SimpleModel.prototype.createIndexes);
			sinon.assert.notCalled(SimpleModel.prototype.dropIndexes);
		});
	});
});
