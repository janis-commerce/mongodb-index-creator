'use strict';

const { struct } = require('superstruct');

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

	if(!Array.isArray(model.constructor.indexes))
		throw new Error(`Invalid indexes for collection ${model.constructor.table}: indexes must be an array of objects`);


	try {

		model.constructor.indexes
			.map(index => indexStruct(index));

	} catch(err) {
		throw new Error(`Invalid indexes for collection ${model.constructor.table}: ${err.message}`);
	}
};
