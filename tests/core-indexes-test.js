'use strict';

const assert = require('assert');

const sinon = require('sinon');
const mockRequire = require('mock-require');

const Model = require('@janiscommerce/model');

const Settings = require('@janiscommerce/settings');
const MongodbIndexCreator = require('../lib/mongodb-index-creator');

const { Results } = require('../lib/helpers');

const SimpleModel = require('./models/core/simple');
const EmptyModel = require('./models/core/empty');

const invalidIndexesModelGenerator = require('./models/core/invalid-indexes');

const mockModel = require('./models/mock-model');

const defaultIndex = require('./default-index.json');

require('../lib/colorful-lllog')('none');

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
		Results.results = null;
	});

	const execute = () => {
		const mongodbIndexCreator = new MongodbIndexCreator();
		return mongodbIndexCreator.execute();
	};

	context('when valid indexes found in models', () => {
		it('shouldn\'t create or drop any indexes if no index in model and collection', async () => {

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

		it('should create a core index', async () => {

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
		});

		it('should drop a core index', async () => {

			mockModel(sinon, { 'empty.js': EmptyModel });

			sinon.stub(EmptyModel.prototype, 'getIndexes')
				.resolves([defaultIndex, {
					name: 'field',
					key: { field: 1 }
				}]);

			sinon.stub(EmptyModel.prototype, 'dropIndexes')
				.resolves(true);

			sinon.stub(EmptyModel.prototype, 'createIndexes')
				.resolves(true);

			await execute();

			sinon.assert.calledOnceWithExactly(EmptyModel.prototype.dropIndexes, ['field']);

			sinon.assert.notCalled(EmptyModel.prototype.createIndexes);
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

			sinon.stub(SimpleModel.prototype, 'dropIndexes')
				.resolves(true);

			sinon.stub(SimpleModel.prototype, 'createIndexes')
				.resolves(true);

			await execute();

			sinon.assert.calledOnceWithExactly(SimpleModel.prototype.dropIndexes, ['oldIndex', 'veryOldIndex']);

			sinon.assert.calledOnceWithExactly(SimpleModel.prototype.createIndexes, [{
				name: 'field',
				key: { field: 1 }
			}]);

			assert.deepStrictEqual(Results.results, {
				[SimpleModel.prototype.databaseKey]: {
					[SimpleModel.table]: {
						dropped: ['oldIndex', 'veryOldIndex'],
						created: ['field']
					}
				}
			});
		});

		it('should create and drop indexes and if fails should save result', async () => {

			mockModel(sinon, { 'simple.js': SimpleModel });

			sinon.stub(SimpleModel.prototype, 'getIndexes')
				.resolves([defaultIndex, {
					name: 'oldIndex',
					key: { oldIndex: 1 }
				}]);

			sinon.stub(SimpleModel.prototype, 'dropIndexes')
				.resolves(false);

			sinon.stub(SimpleModel.prototype, 'createIndexes')
				.resolves(false);

			await execute();

			sinon.assert.calledOnceWithExactly(SimpleModel.prototype.dropIndexes, ['oldIndex']);

			sinon.assert.calledOnceWithExactly(SimpleModel.prototype.createIndexes, [{
				name: 'field',
				key: { field: 1 }
			}]);

			assert.deepStrictEqual(Results.results, {
				[SimpleModel.prototype.databaseKey]: {
					[SimpleModel.table]: {
						dropFailed: ['oldIndex'],
						createFailed: ['field']
					}
				}
			});
		});

		context('when collection is not created in database', () => {
			it('should create a core index', async () => {

				mockModel(sinon, { 'simple.js': SimpleModel });

				sinon.stub(SimpleModel.prototype, 'getIndexes')
					.rejects();

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
			});
		});

		context('when createIndexes fails', () => {
			it('should log the result and continue without rejecting', async () => {

				mockModel(sinon, { 'simple.js': SimpleModel });

				sinon.stub(SimpleModel.prototype, 'getIndexes')
					.resolves([defaultIndex]);

				sinon.stub(SimpleModel.prototype, 'dropIndexes')
					.resolves(true);

				sinon.stub(SimpleModel.prototype, 'createIndexes')
					.rejects('Some error');

				await execute();

				sinon.assert.notCalled(SimpleModel.prototype.dropIndexes);

				sinon.assert.calledOnceWithExactly(SimpleModel.prototype.createIndexes, [{
					name: 'field',
					key: { field: 1 }
				}]);

				assert.deepStrictEqual(Results.results, {
					[SimpleModel.prototype.databaseKey]: {
						[SimpleModel.table]: {
							collectionFailed: ['field']
						}
					}
				});
			});
		});

		context('when dropIndexes fails', () => {
			it('should log the result and continue without rejecting', async () => {

				mockModel(sinon, { 'simple.js': SimpleModel });

				sinon.stub(SimpleModel.prototype, 'getIndexes')
					.resolves([defaultIndex, {
						name: 'otherField',
						key: { otherField: 1 }
					}]);

				sinon.stub(SimpleModel.prototype, 'dropIndexes')
					.rejects('Some error');

				sinon.stub(SimpleModel.prototype, 'createIndexes')
					.resolves(true);

				await execute();

				sinon.assert.calledOnceWithExactly(SimpleModel.prototype.dropIndexes, ['otherField']);

				sinon.assert.calledOnceWithExactly(SimpleModel.prototype.createIndexes, [{
					name: 'field',
					key: { field: 1 }
				}]);

				assert.deepStrictEqual(Results.results, {
					[SimpleModel.prototype.databaseKey]: {
						[SimpleModel.table]: {
							collectionFailed: ['otherField'],
							created: ['field']
						}
					}
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

				sinon.stub(InvalidIndexesModel.prototype, 'dropIndexes')
					.resolves(true);

				sinon.stub(InvalidIndexesModel.prototype, 'createIndexes')
					.resolves(true);

				await execute();

				sinon.assert.notCalled(InvalidIndexesModel.prototype.getIndexes);
				sinon.assert.notCalled(InvalidIndexesModel.prototype.dropIndexes);
				sinon.assert.notCalled(InvalidIndexesModel.prototype.createIndexes);

			});
		});
	});

	context('when models files not found', () => {
		it('shouldn\'t create indexes', async () => {

			sinon.stub(Model.prototype, 'getIndexes');
			sinon.stub(Model.prototype, 'dropIndexes');
			sinon.stub(Model.prototype, 'createIndexes');

			await execute();

			sinon.assert.notCalled(Model.prototype.getIndexes);
			sinon.assert.notCalled(Model.prototype.dropIndexes);
			sinon.assert.notCalled(Model.prototype.createIndexes);
		});
	});

});
