'use strict';

const { struct } = require('@janiscommerce/superstruct');
const MongodbIndexCreatorError = require('../mongodb-index-creator-error');


const indexStruct = struct({
	name: 'string',
	key: 'object',
	unique: 'boolean?',
	expireAfterSeconds: 'number?',
	partialFilterExpression: 'object?',
	sparse: 'boolean?'
});

/**
 * Validates the model indexes
 * @param {object} model
 */
module.exports = model => {

	if(typeof model.constructor.indexes === 'undefined')
		return;

	if(!Array.isArray(model.constructor.indexes)) {
		throw new MongodbIndexCreatorError(`Invalid indexes for collection ${model.constructor.table}: indexes must be an array of objects`,
			MongodbIndexCreatorError.codes.INVALID_INDEXES);
	}


	try {

		model.constructor.indexes
			.map(index => indexStruct(index));

	} catch(err) {
		throw new MongodbIndexCreatorError(`Invalid indexes for collection ${model.constructor.table}: ${err.message}`,
			MongodbIndexCreatorError.codes.INVALID_INDEXES);
	}
};
