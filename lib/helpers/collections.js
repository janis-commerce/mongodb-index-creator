'use strict';

const { struct } = require('superstruct');

const isObject = require('./is-object');

const MongodbIndexCreatorError = require('../mongodb-index-creator-error');

const collectionStruct = struct([
	{
		name: 'string',
		key: 'object',
		unique: 'boolean?'
	}
]);

class CollectionsHelper {

	static validate(collections) {

		if(!isObject(collections)) {
			throw new MongodbIndexCreatorError('Invalid collections: Should exist and must be an object, also not an array.',
				MongodbIndexCreatorError.codes.INVALID_COLLECTIONS);
		}

		try {

			Object.values(collections).forEach(collection => collectionStruct(collection));

		} catch(err) {

			throw new MongodbIndexCreatorError(`Invalid collection index: ${err.message}`,
				MongodbIndexCreatorError.codes.INVALID_COLLECTION_INDEXES);
		}
	}
}

module.exports = CollectionsHelper;