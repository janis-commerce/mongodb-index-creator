'use strict';

const assert = require('assert');

const sinon = require('sinon');
const mockRequire = require('mock-require');

const { Handler } = require('@janiscommerce/lambda');

const Model = require('@janiscommerce/model');

const Settings = require('@janiscommerce/settings');

const { MongoDBIndexCreator } = require('../lib');

const {
	mockModel,
	ClientModel,
	SimpleClientModel,
	CompleteClientModel,
	EmptyClientModel,
	SimpleCoreModel,
	EmptyCoreModel,
	invalidIndexesModelGenerator
} = require('./models');

const { Client } = require('../lib/helpers');

const defaultIndex = require('./default-index.json');
const MongodbIndexCreatorError = require('../lib/mongodb-index-creator-error');

require('lllog')('none');

const fakeDBSettings = {
	core: { write: {} }
};

describe('MongodbIndexCreator', () => {

	beforeEach(() => {
		sinon.stub(Settings, 'get')
			.returns(fakeDBSettings);
	});

	afterEach(() => {
		sinon.restore();
		mockRequire.stopAll();
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

	const execute = () => Handler.handle(MongoDBIndexCreator);

	const executeForClients = clientCode => Handler.handle(MongoDBIndexCreator, { body: { clientCode } });

	context('when valid indexes found in models', () => {
		it('shouldn\'t create or drop any indexes if no index in model and collection', async () => {

			loadClient();

			mockModel(sinon, { 'empty-core.js': EmptyCoreModel, 'empty-client.js': EmptyClientModel });

			sinon.stub(EmptyCoreModel.prototype, 'getIndexes')
				.resolves([defaultIndex]);

			sinon.spy(EmptyCoreModel.prototype, 'dropIndex');
			sinon.spy(EmptyCoreModel.prototype, 'createIndex');

			sinon.stub(EmptyClientModel.prototype, 'getIndexes')
				.resolves([defaultIndex]);

			sinon.spy(EmptyClientModel.prototype, 'dropIndex');
			sinon.spy(EmptyClientModel.prototype, 'createIndex');

			await execute();

			sinon.assert.notCalled(EmptyCoreModel.prototype.dropIndex);
			sinon.assert.notCalled(EmptyCoreModel.prototype.createIndex);

			sinon.assert.notCalled(EmptyClientModel.prototype.dropIndex);
			sinon.assert.notCalled(EmptyClientModel.prototype.createIndex);
		});

		it('Shouldn\'t create or drop any indexes if no changes in indexes', async () => {

			loadClient();

			mockModel(sinon, { 'simple-core.js': SimpleCoreModel, 'simple-client.js': SimpleClientModel });

			sinon.stub(SimpleCoreModel.prototype, 'getIndexes')
				.resolves([defaultIndex, ...SimpleCoreModel.indexes]);

			sinon.spy(SimpleCoreModel.prototype, 'dropIndex');
			sinon.spy(SimpleCoreModel.prototype, 'createIndex');

			sinon.stub(SimpleClientModel.prototype, 'getIndexes')
				.resolves([defaultIndex, ...SimpleClientModel.indexes]);

			sinon.spy(SimpleClientModel.prototype, 'dropIndex');
			sinon.spy(SimpleClientModel.prototype, 'createIndex');

			await execute();

			sinon.assert.notCalled(SimpleCoreModel.prototype.dropIndex);
			sinon.assert.notCalled(SimpleCoreModel.prototype.createIndex);

			sinon.assert.notCalled(SimpleClientModel.prototype.dropIndex);
			sinon.assert.notCalled(SimpleClientModel.prototype.createIndex);
		});

		it('should create a core index', async () => {

			mockModel(sinon, { 'simple.js': SimpleCoreModel });

			sinon.stub(SimpleCoreModel.prototype, 'getIndexes')
				.resolves([defaultIndex]);

			sinon.spy(SimpleCoreModel.prototype, 'dropIndex');

			sinon.stub(SimpleCoreModel.prototype, 'createIndex')
				.resolves(true);

			await execute();

			sinon.assert.notCalled(SimpleCoreModel.prototype.dropIndex);

			sinon.assert.calledOnceWithExactly(SimpleCoreModel.prototype.createIndex, {
				name: 'field',
				key: { field: 1 }
			});
		});

		it('should create a client index', async () => {

			sinon.restore();

			sinon.stub(Settings, 'get')
				.returns(false);

			loadClient();

			mockModel(sinon, { 'simple.js': SimpleClientModel });

			sinon.stub(SimpleClientModel.prototype, 'getIndexes')
				.resolves([defaultIndex]);

			sinon.spy(SimpleClientModel.prototype, 'dropIndex');

			sinon.stub(SimpleClientModel.prototype, 'createIndex')
				.resolves(true);

			await execute();

			sinon.assert.notCalled(SimpleClientModel.prototype.dropIndex);

			sinon.assert.calledOnceWithExactly(SimpleClientModel.prototype.createIndex, {
				name: 'field',
				key: { field: 1 }
			});
		});

		it('should drop a core index', async () => {

			mockModel(sinon, { 'empty.js': EmptyCoreModel });

			sinon.stub(EmptyCoreModel.prototype, 'getIndexes')
				.resolves([defaultIndex, {
					name: 'field',
					key: { field: 1 }
				}]);

			sinon.stub(EmptyCoreModel.prototype, 'dropIndex')
				.resolves(true);

			sinon.spy(EmptyCoreModel.prototype, 'createIndex');

			await execute();

			sinon.assert.calledOnceWithExactly(EmptyCoreModel.prototype.dropIndex, 'field');

			sinon.assert.notCalled(EmptyCoreModel.prototype.createIndex);
		});

		it('should drop a client index', async () => {

			loadClient();

			mockModel(sinon, { 'empty.js': EmptyClientModel });

			sinon.stub(EmptyClientModel.prototype, 'getIndexes')
				.resolves([defaultIndex, {
					name: 'oldIndex',
					key: { oldIndex: 1 }
				}]);

			sinon.stub(EmptyClientModel.prototype, 'dropIndex')
				.resolves(true);

			sinon.spy(EmptyClientModel.prototype, 'createIndex');

			await execute();

			sinon.assert.calledOnceWithExactly(EmptyClientModel.prototype.dropIndex, 'oldIndex');

			sinon.assert.notCalled(EmptyClientModel.prototype.createIndex);
		});

		it('should create and drop core indexes', async () => {

			mockModel(sinon, { 'simple.js': SimpleCoreModel });

			sinon.stub(SimpleCoreModel.prototype, 'getIndexes')
				.resolves([defaultIndex, {
					name: 'oldIndex',
					key: { oldIndex: 1 }
				}, {
					name: 'veryOldIndex',
					key: { veryOldIndex: 1 }
				}]);

			sinon.stub(SimpleCoreModel.prototype, 'dropIndex')
				.resolves(true);

			sinon.stub(SimpleCoreModel.prototype, 'createIndex')
				.resolves(true);

			await execute();

			sinon.assert.calledTwice(SimpleCoreModel.prototype.dropIndex);
			sinon.assert.calledWith(SimpleCoreModel.prototype.dropIndex, 'oldIndex');
			sinon.assert.calledWith(SimpleCoreModel.prototype.dropIndex, 'veryOldIndex');

			sinon.assert.calledOnceWithExactly(SimpleCoreModel.prototype.createIndex, {
				name: 'field',
				key: { field: 1 }
			});
		});

		it('should create and drop client indexes', async () => {

			loadClient();

			mockModel(sinon, { 'simple.js': SimpleClientModel });

			sinon.stub(SimpleClientModel.prototype, 'getIndexes')
				.resolves([defaultIndex, {
					name: 'field',
					key: { field: 1 },
					unique: true,
					sparse: true,
					expireAfterSeconds: 1,
					partialFilterExpression: { eans: { $type: 'string' } }
				}]);

			sinon.stub(SimpleClientModel.prototype, 'dropIndex')
				.resolves(true);

			sinon.stub(SimpleClientModel.prototype, 'createIndex')
				.resolves(true);

			await execute();

			sinon.assert.calledOnceWithExactly(SimpleClientModel.prototype.dropIndex, 'field');

			sinon.assert.calledOnceWithExactly(SimpleClientModel.prototype.createIndex, {
				name: 'field',
				key: { field: 1 }
			});
		});

		it('should process only for received client in payload and ignoring core models', async () => {

			loadClient();

			mockModel(sinon, { 'simple.js': SimpleClientModel, 'core-simple.js': SimpleCoreModel });

			sinon.stub(SimpleClientModel.prototype, 'getIndexes')
				.resolves([defaultIndex]);

			sinon.spy(SimpleClientModel.prototype, 'dropIndex');

			sinon.stub(SimpleClientModel.prototype, 'createIndex')
				.resolves(true);

			sinon.spy(SimpleCoreModel.prototype, 'getIndexes');
			sinon.spy(SimpleCoreModel.prototype, 'dropIndex');
			sinon.spy(SimpleCoreModel.prototype, 'createIndex');

			await executeForClients('the-client-code');

			sinon.assert.notCalled(SimpleClientModel.prototype.dropIndex);

			sinon.assert.calledOnceWithExactly(SimpleClientModel.prototype.createIndex, {
				name: 'field',
				key: { field: 1 }
			});

			sinon.assert.notCalled(SimpleCoreModel.prototype.getIndexes);
			sinon.assert.notCalled(SimpleCoreModel.prototype.createIndex);
			sinon.assert.notCalled(SimpleCoreModel.prototype.dropIndex);

			sinon.assert.calledOnceWithExactly(ClientModel.prototype.get, {
				filters: { code: 'the-client-code' }
			});
		});

		context('when collection is not created in database', () => {
			it('should create a core index', async () => {

				mockModel(sinon, { 'simple.js': SimpleCoreModel });

				sinon.stub(SimpleCoreModel.prototype, 'getIndexes')
					.rejects();

				sinon.stub(SimpleCoreModel.prototype, 'dropIndex')
					.resolves(true);

				sinon.stub(SimpleCoreModel.prototype, 'createIndex')
					.resolves(true);

				await execute();

				sinon.assert.notCalled(SimpleCoreModel.prototype.dropIndex);

				sinon.assert.calledOnceWithExactly(SimpleCoreModel.prototype.createIndex, {
					name: 'field',
					key: { field: 1 }
				});
			});
		});

		context('when createIndex fails', () => {
			it('should not rejects and continue the process', async () => {

				loadClient();

				mockModel(sinon, {
					'simple-core.js': SimpleCoreModel,
					'simple-client.js': SimpleClientModel,
					'complete-client.js': CompleteClientModel
				});

				sinon.stub(SimpleClientModel.prototype, 'getIndexes')
					.resolves([defaultIndex, {
						name: 'badIndex',
						key: { badIndex: 1 }
					}, {
						name: 'otherBadIndex',
						key: { otherBadIndex: 1 }
					}]);

				sinon.stub(SimpleClientModel.prototype, 'dropIndex')
					.resolves(true);

				sinon.stub(SimpleClientModel.prototype, 'createIndex')
					.rejects('Some error');

				sinon.stub(CompleteClientModel.prototype, 'getIndexes')
					.resolves([defaultIndex, {
						name: 'oldIndex',
						key: { oldIndex: 1 }
					}]);

				sinon.stub(CompleteClientModel.prototype, 'dropIndex')
					.resolves(true);

				sinon.stub(CompleteClientModel.prototype, 'createIndex')
					.resolves(true);

				sinon.stub(SimpleCoreModel.prototype, 'getIndexes')
					.resolves([defaultIndex, {
						name: 'otherField',
						key: { otherField: 1 }
					}]);

				sinon.stub(SimpleCoreModel.prototype, 'dropIndex')
					.resolves(true);

				sinon.stub(SimpleCoreModel.prototype, 'createIndex')
					.rejects('Some error');

				await execute();

				sinon.assert.calledTwice(SimpleClientModel.prototype.dropIndex);
				sinon.assert.calledWith(SimpleClientModel.prototype.dropIndex, 'badIndex');
				sinon.assert.calledWith(SimpleClientModel.prototype.dropIndex, 'otherBadIndex');

				sinon.assert.calledOnceWithExactly(SimpleClientModel.prototype.createIndex, {
					name: 'field',
					key: { field: 1 }
				});

				sinon.assert.calledOnceWithExactly(CompleteClientModel.prototype.dropIndex, 'oldIndex');

				sinon.assert.calledWith(CompleteClientModel.prototype.createIndex, {
					name: 'field',
					key: { field: 1 }
				});

				sinon.assert.calledWith(CompleteClientModel.prototype.createIndex, {
					name: 'foo_bar_unique',
					key: { foo: 1, bar: 1 },
					unique: true
				});

				sinon.assert.calledTwice(CompleteClientModel.prototype.createIndex);

				sinon.assert.calledOnceWithExactly(SimpleCoreModel.prototype.dropIndex, 'otherField');

				sinon.assert.calledOnceWithExactly(SimpleCoreModel.prototype.createIndex, {
					name: 'field',
					key: { field: 1 }
				});
			});
		});

		context('when dropIndex fails', () => {
			it('should not rejects and continue the process', async () => {

				mockModel(sinon, { 'simple.js': SimpleCoreModel });

				sinon.stub(SimpleCoreModel.prototype, 'getIndexes')
					.resolves([defaultIndex, {
						name: 'otherField',
						key: { otherField: 1 }
					}]);

				sinon.stub(SimpleCoreModel.prototype, 'dropIndex')
					.rejects('Some error');

				sinon.stub(SimpleCoreModel.prototype, 'createIndex')
					.resolves(true);

				await execute();

				sinon.assert.calledOnceWithExactly(SimpleCoreModel.prototype.dropIndex, 'otherField');

				sinon.assert.calledOnceWithExactly(SimpleCoreModel.prototype.createIndex, {
					name: 'field',
					key: { field: 1 }
				});
			});
		});

		context('when clients not found', () => {
			it('shouldn\'t process indexes', async () => {

				mockRequire(Client.getRelativePath(), ClientModel);

				sinon.stub(ClientModel.prototype, 'get')
					.resolves([]);

				mockModel(sinon, { 'simple.js': SimpleClientModel });

				sinon.stub(SimpleClientModel.prototype, 'getIndexes');
				sinon.stub(SimpleClientModel.prototype, 'dropIndex');
				sinon.stub(SimpleClientModel.prototype, 'createIndex');

				await executeForClients(['the-client-code', 'other-client-code']);

				sinon.assert.notCalled(SimpleClientModel.prototype.getIndexes);
				sinon.assert.notCalled(SimpleClientModel.prototype.createIndex);
				sinon.assert.notCalled(SimpleClientModel.prototype.dropIndex);

				sinon.assert.calledOnceWithExactly(ClientModel.prototype.get, {
					filters: { code: ['the-client-code', 'other-client-code'] }
				});
			});
		});

		context('when model client rejects', () => {
			it('shouldn\'t process indexes', async () => {

				mockRequire(Client.getRelativePath(), ClientModel);

				sinon.stub(ClientModel.prototype, 'get')
					.rejects('some error');

				mockModel(sinon, { 'simple.js': SimpleClientModel });

				sinon.stub(SimpleClientModel.prototype, 'getIndexes');
				sinon.stub(SimpleClientModel.prototype, 'dropIndex');
				sinon.stub(SimpleClientModel.prototype, 'createIndex');

				await execute();

				sinon.assert.notCalled(SimpleClientModel.prototype.getIndexes);
				sinon.assert.notCalled(SimpleClientModel.prototype.createIndex);
				sinon.assert.notCalled(SimpleClientModel.prototype.dropIndex);
			});
		});
	});

	context('when invalid index found', () => {

		const validIndex = {
			name: 'field',
			key: { field: 1 },
			unique: true,
			expireAfterSeconds: 10
		};

		const invalidIndexes = [
			{},
			{ field: 1 },
			1,
			'field',
			true,
			false,
			[1],
			['field', 'field2'],
			[{ index: 1 }],
			[{ ...validIndex, name: 1 }],
			[{ ...validIndex, name: true }],
			[{ ...validIndex, name: [1] }],
			[{ ...validIndex, name: { name: 'name' } }],
			[{ ...validIndex, key: 'the-key' }],
			[{ ...validIndex, key: 1 }],
			[{ ...validIndex, key: true }],
			[{ ...validIndex, key: [1] }],
			[{ ...validIndex, unique: 'yes' }],
			[{ ...validIndex, unique: 1 }],
			[{ ...validIndex, unique: [1] }],
			[{ ...validIndex, unique: { isUnique: true } }],
			[{ ...validIndex, expireAfterSeconds: true }],
			[{ ...validIndex, expireAfterSeconds: '10' }],
			[{ ...validIndex, expireAfterSeconds: [1] }],
			[{ ...validIndex, expireAfterSeconds: { seconds: 10 } }]
		];

		invalidIndexes.forEach(invalidIndex => {
			it('rejects if invalid index found in model', async () => {

				const InvalidIndexesModel = invalidIndexesModelGenerator(invalidIndex);

				mockModel(sinon, { 'invalid-indexes.js': InvalidIndexesModel });

				sinon.stub(InvalidIndexesModel.prototype, 'getIndexes')
					.resolves([defaultIndex]);

				sinon.stub(InvalidIndexesModel.prototype, 'dropIndex')
					.resolves(true);

				sinon.stub(InvalidIndexesModel.prototype, 'createIndex')
					.resolves(true);

				await assert.rejects(execute(), { code: MongodbIndexCreatorError.codes.INVALID_INDEXES });

				sinon.assert.notCalled(InvalidIndexesModel.prototype.getIndexes);
				sinon.assert.notCalled(InvalidIndexesModel.prototype.dropIndex);
				sinon.assert.notCalled(InvalidIndexesModel.prototype.createIndex);

			});
		});
	});

	context('when models files not found', () => {
		it('shouldn\'t create indexes', async () => {

			sinon.stub(Model.prototype, 'getIndexes');
			sinon.stub(Model.prototype, 'dropIndex');
			sinon.stub(Model.prototype, 'createIndex');

			await execute();

			sinon.assert.notCalled(Model.prototype.getIndexes);
			sinon.assert.notCalled(Model.prototype.dropIndex);
			sinon.assert.notCalled(Model.prototype.createIndex);
		});
	});

});
