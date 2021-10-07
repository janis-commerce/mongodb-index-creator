'use strict';

const assert = require('assert');

const MongodbIndexCreatorError = require('../lib/mongodb-index-creator-error');

describe('MongoDB Error', () => {

	it('Should accept a message error and a code', () => {
		const error = new MongodbIndexCreatorError('Some error', MongodbIndexCreatorError.codes.CREATE_INDEX_ERROR);

		assert.strictEqual(error.message, 'Some error');
		assert.strictEqual(error.code, MongodbIndexCreatorError.codes.CREATE_INDEX_ERROR);
		assert.strictEqual(error.name, 'MongodbIndexCreatorError');
	});

	it('Should accept an error instance and a code', () => {

		const previousError = new Error('Some error');

		const error = new MongodbIndexCreatorError(previousError, MongodbIndexCreatorError.codes.DROP_INDEX_ERROR);

		assert.strictEqual(error.message, 'Some error');
		assert.strictEqual(error.code, MongodbIndexCreatorError.codes.DROP_INDEX_ERROR);
		assert.strictEqual(error.name, 'MongodbIndexCreatorError');
		assert.strictEqual(error.previousError, previousError);
	});
});
