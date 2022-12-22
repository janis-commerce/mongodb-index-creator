'use strict';

const assert = require('assert');

const sinon = require('sinon');
const mockRequire = require('mock-require');

const { Handler } = require('@janiscommerce/lambda');

const Model = require('@janiscommerce/model');

const Settings = require('@janiscommerce/settings');

const { MongoDBIndexCreator } = require('../lib');

const SimpleModel = require('./models/core/simple');
const EmptyModel = require('./models/core/empty');

const invalidIndexesModelGenerator = require('./models/core/invalid-indexes');

const mockModel = require('./models/mock-model');

const defaultIndex = require('./default-index.json');
const MongodbIndexCreatorError = require('../lib/mongodb-index-creator-error');

require('lllog')('none');

const fakeDBSettings = {
	core: { write: {} }
};

describe('MongodbIndexCreator - Core Indexes', () => {

	beforeEach(() => {
		sinon.stub(Settings, 'get')
			.returns(fakeDBSettings);
	});

	afterEach(() => {
		sinon.restore();
		mockRequire.stopAll();
	});

	const execute = () => {
		return Handler.handle(MongoDBIndexCreator);
	};

	context('when valid indexes found in models', () => {
		it('shouldn\'t create or drop any indexes if no index in model and collection', async () => {

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

		it('should create a core index', async () => {

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
		});

		it('should drop a core index', async () => {

			mockModel(sinon, { 'empty.js': EmptyModel });

			sinon.stub(EmptyModel.prototype, 'getIndexes')
				.resolves([defaultIndex, {
					name: 'field',
					key: { field: 1 }
				}]);

			sinon.stub(EmptyModel.prototype, 'dropIndex')
				.resolves(true);

			sinon.stub(EmptyModel.prototype, 'createIndex')
				.resolves(true);

			await execute();

			sinon.assert.calledOnceWithExactly(EmptyModel.prototype.dropIndex, 'field');

			sinon.assert.notCalled(EmptyModel.prototype.createIndex);
		});

		it('should create and drop indexes and save results', async () => {

			mockModel(sinon, { 'simple.js': SimpleModel });

			sinon.stub(SimpleModel.prototype, 'getIndexes')
				.resolves([defaultIndex, {
					name: 'oldIndex',
					key: { oldIndex: 1 }
				}, {
					name: 'veryOldIndex',
					key: { veryOldIndex: 1 }
				}]);

			sinon.stub(SimpleModel.prototype, 'dropIndex')
				.resolves(true);

			sinon.stub(SimpleModel.prototype, 'createIndex')
				.resolves(true);

			await execute();

			sinon.assert.calledWith(SimpleModel.prototype.dropIndex, 'oldIndex');
			sinon.assert.calledWith(SimpleModel.prototype.dropIndex, 'veryOldIndex');
			sinon.assert.calledTwice(SimpleModel.prototype.dropIndex);

			sinon.assert.calledOnceWithExactly(SimpleModel.prototype.createIndex, {
				name: 'field',
				key: { field: 1 }
			});
		});

		it('should create and drop indexes and if fails should save result', async () => {

			mockModel(sinon, { 'simple.js': SimpleModel });

			sinon.stub(SimpleModel.prototype, 'getIndexes')
				.resolves([defaultIndex, {
					name: 'oldIndex',
					key: { oldIndex: 1 }
				}]);

			sinon.stub(SimpleModel.prototype, 'dropIndex')
				.resolves(false);

			sinon.stub(SimpleModel.prototype, 'createIndex')
				.resolves(false);

			await execute();

			sinon.assert.calledOnceWithExactly(SimpleModel.prototype.dropIndex, 'oldIndex');

			sinon.assert.calledOnceWithExactly(SimpleModel.prototype.createIndex, {
				name: 'field',
				key: { field: 1 }
			});
		});

		context('when collection is not created in database', () => {
			it('should create a core index', async () => {

				mockModel(sinon, { 'simple.js': SimpleModel });

				sinon.stub(SimpleModel.prototype, 'getIndexes')
					.rejects();

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
			});
		});

		context('when createIndex fails', () => {
			it('should not rejects and continue the process', async () => {

				mockModel(sinon, { 'simple.js': SimpleModel });

				sinon.stub(SimpleModel.prototype, 'getIndexes')
					.resolves([defaultIndex, {
						name: 'otherField',
						key: { otherField: 1 }
					}]);

				sinon.stub(SimpleModel.prototype, 'dropIndex')
					.resolves(true);

				sinon.stub(SimpleModel.prototype, 'createIndex')
					.rejects('Some error');

				await execute();

				sinon.assert.calledOnceWithExactly(SimpleModel.prototype.dropIndex, 'otherField');

				sinon.assert.calledOnceWithExactly(SimpleModel.prototype.createIndex, {
					name: 'field',
					key: { field: 1 }
				});
			});
		});

		context('when dropIndex fails', () => {
			it('should not rejects and continue the process', async () => {

				mockModel(sinon, { 'simple.js': SimpleModel });

				sinon.stub(SimpleModel.prototype, 'getIndexes')
					.resolves([defaultIndex, {
						name: 'otherField',
						key: { otherField: 1 }
					}]);

				sinon.stub(SimpleModel.prototype, 'dropIndex')
					.rejects('Some error');

				sinon.stub(SimpleModel.prototype, 'createIndex')
					.resolves(true);

				await execute();

				sinon.assert.calledOnceWithExactly(SimpleModel.prototype.dropIndex, 'otherField');

				sinon.assert.calledOnceWithExactly(SimpleModel.prototype.createIndex, {
					name: 'field',
					key: { field: 1 }
				});
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
