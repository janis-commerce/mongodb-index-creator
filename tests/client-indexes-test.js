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

const SimpleCoreModel = require('./models/core/simple');

const mockModel = require('./models/mock-model');

const defaultIndex = require('./default-index.json');
const MongodbIndexCreatorError = require('../lib/mongodb-index-creator-error');

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

	const loadClient = () => {

		mockRequire(Client.getRelativePath(), ClientModel);

		sinon.stub(ClientModel.prototype, 'getIndexes')
			.resolves([defaultIndex]);

		sinon.stub(ClientModel.prototype, 'dropIndex')
			.resolves(true);

		sinon.stub(ClientModel.prototype, 'createIndex')
			.resolves(true);

		sinon.stub(ClientModel.prototype, 'get')
			.resolves([{
				code: 'the-client-code',
				databases: {
					default: {
						write: {}
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

			sinon.stub(EmptyModel.prototype, 'dropIndex')
				.resolves(true);

			sinon.stub(EmptyModel.prototype, 'createIndex')
				.resolves(true);

			await execute();

			sinon.assert.notCalled(EmptyModel.prototype.dropIndex);
			sinon.assert.notCalled(EmptyModel.prototype.createIndex);
		});

		it('shouldn\'t create or drop any indexes if no changes in indexes', async () => {

			loadClient();

			mockModel(sinon, { 'simple.js': SimpleModel });

			sinon.stub(SimpleModel.prototype, 'getIndexes')
				.resolves([defaultIndex, {
					name: 'field',
					key: { field: 1 }
				}]);

			sinon.stub(SimpleModel.prototype, 'dropIndex')
				.resolves(true);

			sinon.stub(SimpleModel.prototype, 'createIndex')
				.resolves(true);

			await execute();

			sinon.assert.notCalled(SimpleModel.prototype.dropIndex);
			sinon.assert.notCalled(SimpleModel.prototype.createIndex);
		});

		it('should create a client index and save results', async () => {

			sinon.restore();

			sinon.stub(Settings, 'get')
				.returns(false);

			loadClient();

			mockModel(sinon, { 'simple.js': SimpleModel });

			sinon.stub(SimpleModel.prototype, 'getIndexes')
				.resolves([defaultIndex]);

			sinon.stub(SimpleModel.prototype, 'dropIndex')
				.resolves(true);

			sinon.stub(SimpleModel.prototype, 'createIndex')
				.resolves(true);

			await execute();

			sinon.assert.notCalled(SimpleModel.prototype.dropIndex);

			sinon.assert.calledOnceWithExactly(SimpleModel.prototype.createIndex, {
				name: 'field',
				key: { field: 1 }
			});

			assert.deepStrictEqual(Results.results, {
				'the-client-code': {
					[SimpleModel.table]: {
						created: ['field']
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
					unique: true,
					sparse: true,
					expireAfterSeconds: 1,
					partialFilterExpression: { eans: { $type: 'string' } }
				}]);

			sinon.stub(SimpleModel.prototype, 'dropIndex')
				.resolves(true);

			sinon.stub(SimpleModel.prototype, 'createIndex')
				.resolves(true);

			await execute();

			sinon.assert.calledOnceWithExactly(SimpleModel.prototype.dropIndex, 'field');

			sinon.assert.calledOnceWithExactly(SimpleModel.prototype.createIndex, {
				name: 'field',
				key: { field: 1 }
			});

			assert.deepStrictEqual(Results.results, {
				'the-client-code': {
					[SimpleModel.table]: {
						created: ['field'],
						dropped: ['field']
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

			sinon.stub(EmptyModel.prototype, 'dropIndex')
				.resolves(true);

			sinon.stub(EmptyModel.prototype, 'createIndex')
				.resolves(true);

			await execute();

			sinon.assert.calledOnceWithExactly(EmptyModel.prototype.dropIndex, 'oldIndex');

			sinon.assert.notCalled(EmptyModel.prototype.createIndex);
		});

		it('should create and drop client indexes', async () => {

			loadClient();

			mockModel(sinon, { 'simple.js': SimpleModel });

			sinon.stub(SimpleModel.prototype, 'getIndexes')
				.resolves([defaultIndex, {
					name: 'oldIndex',
					key: { oldIndex: 1 }
				}]);

			sinon.stub(SimpleModel.prototype, 'dropIndex')
				.resolves(true);

			sinon.stub(SimpleModel.prototype, 'createIndex')
				.resolves(true);

			await execute();

			sinon.assert.calledOnceWithExactly(SimpleModel.prototype.dropIndex, 'oldIndex');

			sinon.assert.calledOnceWithExactly(SimpleModel.prototype.createIndex, {
				name: 'field',
				key: { field: 1 }
			});
		});

		it('should process only for client when is executed with executeForClientCode(code)', async () => {

			loadClient();

			mockModel(sinon, { 'simple.js': SimpleModel, 'core-simple.js': SimpleCoreModel });

			sinon.stub(SimpleModel.prototype, 'getIndexes')
				.resolves([defaultIndex]);

			sinon.spy(SimpleModel.prototype, 'dropIndex');

			sinon.stub(SimpleModel.prototype, 'createIndex')
				.resolves(true);

			sinon.spy(SimpleCoreModel.prototype, 'getIndexes');

			sinon.spy(SimpleCoreModel.prototype, 'dropIndex');

			sinon.spy(SimpleCoreModel.prototype, 'createIndex');

			await executeForCode('the-client-code');

			sinon.assert.notCalled(SimpleModel.prototype.dropIndex);

			sinon.assert.calledOnceWithExactly(SimpleModel.prototype.createIndex, {
				name: 'field',
				key: { field: 1 }
			});

			sinon.assert.notCalled(SimpleCoreModel.prototype.getIndexes);
			sinon.assert.notCalled(SimpleCoreModel.prototype.createIndex);
			sinon.assert.notCalled(SimpleCoreModel.prototype.dropIndex);

		});

		context('when createIndex fails for some indexes', () => {
			it('should reject with a INDEX CREATE ERROR code', async () => {

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

				sinon.stub(SimpleModel.prototype, 'dropIndex')
					.resolves(true);

				sinon.stub(SimpleModel.prototype, 'createIndex')
					.rejects('Some error');

				sinon.stub(CompleteModel.prototype, 'getIndexes')
					.resolves([defaultIndex, {
						name: 'oldIndex',
						key: { oldIndex: 1 }
					}]);

				sinon.stub(CompleteModel.prototype, 'dropIndex')
					.resolves(true);

				sinon.stub(CompleteModel.prototype, 'createIndex')
					.resolves(true);

				await assert.rejects(() => execute(), {
					code: MongodbIndexCreatorError.codes.CREATE_INDEX_ERROR
				});

				sinon.assert.calledWith(SimpleModel.prototype.dropIndex, 'badIndex');
				sinon.assert.calledWith(SimpleModel.prototype.dropIndex, 'otherBadIndex');
				sinon.assert.calledTwice(SimpleModel.prototype.dropIndex);

				sinon.assert.calledOnceWithExactly(SimpleModel.prototype.createIndex, {
					name: 'field',
					key: { field: 1 }
				});

				sinon.assert.calledOnceWithExactly(CompleteModel.prototype.dropIndex, 'oldIndex');

				sinon.assert.calledWith(CompleteModel.prototype.createIndex, {
					name: 'field',
					key: { field: 1 }
				});

				sinon.assert.calledWith(CompleteModel.prototype.createIndex, {
					name: 'foo_bar_unique',
					key: { foo: 1, bar: 1 },
					unique: true
				});

				sinon.assert.calledTwice(CompleteModel.prototype.createIndex);

				assert.deepStrictEqual(Results.results, {
					'the-client-code': {
						[SimpleModel.table]: {
							error: ['field'],
							dropped: ['badIndex', 'otherBadIndex']
						},
						[CompleteModel.table]: {
							created: ['field', 'foo_bar_unique'],
							dropped: ['oldIndex']
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
			sinon.stub(SimpleModel.prototype, 'dropIndex');
			sinon.stub(SimpleModel.prototype, 'createIndex');

			await executeForCode('the-client-code');

			sinon.assert.notCalled(SimpleModel.prototype.getIndexes);
			sinon.assert.notCalled(SimpleModel.prototype.createIndex);
			sinon.assert.notCalled(SimpleModel.prototype.dropIndex);
		});
	});

	context('when model client rejects', () => {
		it('shouldn\'t process indexes', async () => {

			mockRequire(Client.getRelativePath(), ClientModel);

			sinon.stub(ClientModel.prototype, 'get')
				.rejects('some error');

			mockModel(sinon, { 'simple.js': SimpleModel });

			sinon.stub(SimpleModel.prototype, 'getIndexes');
			sinon.stub(SimpleModel.prototype, 'dropIndex');
			sinon.stub(SimpleModel.prototype, 'createIndex');

			await execute();

			sinon.assert.notCalled(SimpleModel.prototype.getIndexes);
			sinon.assert.notCalled(SimpleModel.prototype.createIndex);
			sinon.assert.notCalled(SimpleModel.prototype.dropIndex);
		});
	});
});
