'use strict';

const assert = require('assert');

const sandbox = require('sinon').createSandbox();
const mockRequire = require('mock-require');

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

describe('MongodbIndexCreator - Client Indexes', () => {

	afterEach(() => {
		sandbox.restore();
		mockRequire.stopAll();
		Results.results = null;
	});

	const loadClient = (addRead = false) => {

		mockRequire(Client.getRelativePath(), ClientModel);

		sandbox.stub(ClientModel.prototype, 'getIndexes')
			.resolves([defaultIndex]);

		sandbox.stub(ClientModel.prototype, 'dropIndexes')
			.resolves(true);

		sandbox.stub(ClientModel.prototype, 'createIndexes')
			.resolves(true);

		sandbox.stub(ClientModel.prototype, 'get')
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

			mockModel(sandbox, { 'empty.js': EmptyModel });

			sandbox.stub(EmptyModel.prototype, 'getIndexes')
				.resolves([defaultIndex]);

			sandbox.stub(EmptyModel.prototype, 'dropIndexes')
				.resolves(true);

			sandbox.stub(EmptyModel.prototype, 'createIndexes')
				.resolves(true);

			await execute();

			sandbox.assert.notCalled(EmptyModel.prototype.dropIndexes);
			sandbox.assert.notCalled(EmptyModel.prototype.createIndexes);
		});

		it('shouldn\'t create or drop any indexes if no changes in indexes', async () => {

			loadClient();

			mockModel(sandbox, { 'simple.js': SimpleModel });

			sandbox.stub(SimpleModel.prototype, 'getIndexes')
				.resolves([defaultIndex, {
					name: 'field',
					key: { field: 1 }
				}]);

			sandbox.stub(SimpleModel.prototype, 'dropIndexes')
				.resolves(true);

			sandbox.stub(SimpleModel.prototype, 'createIndexes')
				.resolves(true);

			await execute();

			sandbox.assert.notCalled(SimpleModel.prototype.dropIndexes);
			sandbox.assert.notCalled(SimpleModel.prototype.createIndexes);
		});

		it('should create a client index and save results', async () => {

			loadClient();

			mockModel(sandbox, { 'simple.js': SimpleModel });

			sandbox.stub(SimpleModel.prototype, 'getIndexes')
				.resolves([defaultIndex]);

			sandbox.stub(SimpleModel.prototype, 'dropIndexes')
				.resolves(true);

			sandbox.stub(SimpleModel.prototype, 'createIndexes')
				.resolves(true);

			await execute();

			sandbox.assert.notCalled(SimpleModel.prototype.dropIndexes);

			sandbox.assert.calledOnceWithExactly(SimpleModel.prototype.createIndexes, [{
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

		it('should drop a client index', async () => {

			loadClient();

			mockModel(sandbox, { 'empty.js': EmptyModel });

			sandbox.stub(EmptyModel.prototype, 'getIndexes')
				.resolves([defaultIndex, {
					name: 'oldIndex',
					key: { oldIndex: 1 }
				}]);

			sandbox.stub(EmptyModel.prototype, 'dropIndexes')
				.resolves(true);

			sandbox.stub(EmptyModel.prototype, 'createIndexes')
				.resolves(true);

			await execute();

			sandbox.assert.calledOnceWithExactly(EmptyModel.prototype.dropIndexes, ['oldIndex']);

			sandbox.assert.notCalled(EmptyModel.prototype.createIndexes);
		});

		it('should create and drop client indexex', async () => {

			loadClient();

			mockModel(sandbox, { 'simple.js': SimpleModel });

			sandbox.stub(SimpleModel.prototype, 'getIndexes')
				.resolves([defaultIndex, {
					name: 'oldIndex',
					key: { oldIndex: 1 }
				}]);

			sandbox.stub(SimpleModel.prototype, 'dropIndexes')
				.resolves(true);

			sandbox.stub(SimpleModel.prototype, 'createIndexes')
				.resolves(true);

			await execute();

			sandbox.assert.calledOnceWithExactly(SimpleModel.prototype.dropIndexes, ['oldIndex']);

			sandbox.assert.calledOnceWithExactly(SimpleModel.prototype.createIndexes, [{
				name: 'field',
				key: { field: 1 }
			}]);

		});

		it('should process only for client when is executed with executeForClientCode(code)', async () => {

			loadClient();

			mockModel(sandbox, { 'simple.js': SimpleModel, 'core-simple.js': SimpleCoreModel });

			sandbox.stub(SimpleModel.prototype, 'getIndexes')
				.resolves([defaultIndex]);

			sandbox.stub(SimpleModel.prototype, 'dropIndexes')
				.resolves(true);

			sandbox.stub(SimpleModel.prototype, 'createIndexes')
				.resolves(true);

			sandbox.stub(SimpleCoreModel.prototype, 'getIndexes');

			sandbox.stub(SimpleCoreModel.prototype, 'dropIndexes');

			sandbox.stub(SimpleCoreModel.prototype, 'createIndexes');

			await executeForCode('the-client-code');

			sandbox.assert.notCalled(SimpleModel.prototype.dropIndexes);

			sandbox.assert.calledOnceWithExactly(SimpleModel.prototype.createIndexes, [{
				name: 'field',
				key: { field: 1 }
			}]);

			sandbox.assert.notCalled(SimpleCoreModel.prototype.getIndexes);
			sandbox.assert.notCalled(SimpleCoreModel.prototype.createIndexes);
			sandbox.assert.notCalled(SimpleCoreModel.prototype.dropIndexes);

		});

		context('when model has read db', () => {

			it('should create a client index when write and read databases present', async () => {

				loadClient(true);

				mockModel(sandbox, { 'simple.js': SimpleReadModel });

				sandbox.stub(SimpleReadModel.prototype, 'getIndexes')
					.resolves([defaultIndex]);

				sandbox.stub(SimpleReadModel.prototype, 'dropIndexes')
					.resolves(true);

				sandbox.stub(SimpleReadModel.prototype, 'createIndexes')
					.resolves(true);

				await execute();

				sandbox.assert.notCalled(SimpleReadModel.prototype.dropIndexes);

				sandbox.assert.calledTwice(SimpleReadModel.prototype.createIndexes);

				sandbox.assert.calledWithExactly(SimpleReadModel.prototype.createIndexes, [{
					name: 'field',
					key: { field: 1 }
				}]);
			});

			it('should create and drop client indexex for read database', async () => {

				loadClient(true);

				mockModel(sandbox, { 'simple.js': SimpleReadModel });

				sandbox.stub(SimpleReadModel.prototype, 'getIndexes')
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

				sandbox.stub(SimpleReadModel.prototype, 'dropIndexes')
					.rejects('dropping error message');

				sandbox.stub(SimpleReadModel.prototype, 'createIndexes')
					.resolves(true);

				await execute();

				// se dropea para la base read
				sandbox.assert.calledOnceWithExactly(SimpleReadModel.prototype.dropIndexes, ['wrongField']);

				// se crea para la base read
				sandbox.assert.calledOnceWithExactly(SimpleReadModel.prototype.createIndexes, [{
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

				mockModel(sandbox, { 'simple.js': SimpleModel, 'complete.js': CompleteModel });

				sandbox.stub(SimpleModel.prototype, 'getIndexes')
					.resolves([defaultIndex, {
						name: 'badIndex',
						key: { badIndex: 1 }
					}, {
						name: 'otherBadIndex',
						key: { otherBadIndex: 1 }
					}]);

				sandbox.stub(SimpleModel.prototype, 'dropIndexes')
					.resolves(true);

				sandbox.stub(SimpleModel.prototype, 'createIndexes')
					.rejects('Some error');

				sandbox.stub(CompleteModel.prototype, 'getIndexes')
					.resolves([defaultIndex, {
						name: 'oldIndex',
						key: { oldIndex: 1 }
					}]);

				sandbox.stub(CompleteModel.prototype, 'dropIndexes')
					.resolves(true);

				sandbox.stub(CompleteModel.prototype, 'createIndexes')
					.resolves(true);

				await execute();

				sandbox.assert.calledOnceWithExactly(SimpleModel.prototype.dropIndexes, ['badIndex', 'otherBadIndex']);

				sandbox.assert.calledOnceWithExactly(SimpleModel.prototype.createIndexes, [{
					name: 'field',
					key: { field: 1 }
				}]);

				sandbox.assert.calledOnceWithExactly(CompleteModel.prototype.dropIndexes, ['oldIndex']);

				sandbox.assert.calledOnceWithExactly(CompleteModel.prototype.createIndexes, [{
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

			sandbox.stub(ClientModel.prototype, 'get')
				.resolves([]);

			mockModel(sandbox, { 'simple.js': SimpleModel });

			sandbox.stub(SimpleModel.prototype, 'getIndexes');
			sandbox.stub(SimpleModel.prototype, 'dropIndexes');
			sandbox.stub(SimpleModel.prototype, 'createIndexes');

			await executeForCode('the-client-code');

			sandbox.assert.notCalled(SimpleModel.prototype.getIndexes);
			sandbox.assert.notCalled(SimpleModel.prototype.createIndexes);
			sandbox.assert.notCalled(SimpleModel.prototype.dropIndexes);
		});
	});

	context('when model client rejects', () => {
		it('shouldn\'t process indexes', async () => {

			mockRequire(Client.getRelativePath(), ClientModel);

			sandbox.stub(ClientModel.prototype, 'get')
				.rejects('some error');

			mockModel(sandbox, { 'simple.js': SimpleModel });

			sandbox.stub(SimpleModel.prototype, 'getIndexes');
			sandbox.stub(SimpleModel.prototype, 'dropIndexes');
			sandbox.stub(SimpleModel.prototype, 'createIndexes');

			await execute();

			sandbox.assert.notCalled(SimpleModel.prototype.getIndexes);
			sandbox.assert.notCalled(SimpleModel.prototype.createIndexes);
			sandbox.assert.notCalled(SimpleModel.prototype.dropIndexes);
		});
	});
});
