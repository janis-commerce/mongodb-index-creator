'use strict';

const assert = require('assert');

const sandbox = require('sinon').createSandbox();
const mockRequire = require('mock-require');

const path = require('path');
const fs = require('fs');

const MongodbIndexCreator = require('../lib/mongodb-index-creator');
const MongodbIndexCreatorError = require('../lib/mongodb-index-creator-error');

const { Models } = require('../lib/helpers');

const SimpleModel = require('./models/core/simple');
const EmptyModel = require('./models/core/empty');

const invalidIndexesModelGenerator = require('./models/core/invalid-indexes');

const defaultIndex = require('./default.index');

require('../lib/colorful-lllog')('none');

describe('MongodbIndexCreator - Core Indexes', () => {

	afterEach(() => {
		sandbox.restore();
		mockRequire.stopAll();
	});

	const execute = () => {
		const mongodbIndexCreator = new MongodbIndexCreator();
		return mongodbIndexCreator.execute();
	};

	it('shouldn\'t create or drop any indexes if no index in model and collection', async () => {

		sandbox.stub(fs, 'readdirSync')
			.returns(['empty.js']);

		mockRequire(path.join(Models.path, 'empty.js'), EmptyModel);

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

		sandbox.stub(fs, 'readdirSync')
			.returns(['simple.js']);

		mockRequire(path.join(Models.path, 'simple.js'), SimpleModel);

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

	it('should create a core index', async () => {

		sandbox.stub(fs, 'readdirSync')
			.returns(['simple.js']);

		mockRequire(path.join(Models.path, 'simple.js'), SimpleModel);

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
	});

	it('should drop a core index', async () => {

		sandbox.stub(fs, 'readdirSync')
			.returns(['empty.js']);

		mockRequire(path.join(Models.path, 'empty.js'), EmptyModel);

		sandbox.stub(EmptyModel.prototype, 'getIndexes')
			.resolves([defaultIndex, {
				name: 'field',
				key: { field: 1 }
			}]);

		sandbox.stub(EmptyModel.prototype, 'dropIndexes')
			.resolves(true);

		sandbox.stub(EmptyModel.prototype, 'createIndexes')
			.resolves(true);

		await execute();

		sandbox.assert.calledOnceWithExactly(EmptyModel.prototype.dropIndexes, ['field']);

		sandbox.assert.notCalled(EmptyModel.prototype.createIndexes);
	});

	it('should create and drop indexes', async () => {

		sandbox.stub(fs, 'readdirSync')
			.returns(['simple.js']);

		mockRequire(path.join(Models.path, 'simple.js'), SimpleModel);

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

				sandbox.stub(fs, 'readdirSync')
					.returns(['invalid-indexes.js']);

				const InvalidIndexesModel = invalidIndexesModelGenerator(invalidIndex);

				mockRequire(path.join(Models.path, 'invalid-indexes.js'), InvalidIndexesModel);

				sandbox.stub(InvalidIndexesModel.prototype, 'getIndexes')
					.resolves([defaultIndex]);

				sandbox.stub(InvalidIndexesModel.prototype, 'dropIndexes')
					.resolves(true);

				sandbox.stub(InvalidIndexesModel.prototype, 'createIndexes')
					.resolves(true);

				await assert.rejects(() => execute(), {
					name: 'MongodbIndexCreatorError',
					code: MongodbIndexCreatorError.codes.INVALID_COLLECTION_INDEXES
				});

				sandbox.assert.notCalled(InvalidIndexesModel.prototype.getIndexes);
				sandbox.assert.notCalled(InvalidIndexesModel.prototype.dropIndexes);
				sandbox.assert.notCalled(InvalidIndexesModel.prototype.createIndexes);

			});
		});
	});

});