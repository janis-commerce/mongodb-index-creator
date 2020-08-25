'use strict';

const path = require('path');

const { struct } = require('superstruct');

const isObject = require('./is-object');

const MongodbIndexCreatorError = require('../mongodb-index-creator-error');

const SCHEMAS_PATH = path.join(process.cwd(), 'schemas', 'mongo', 'indexes');

const collectionStruct = struct([{
	name: 'string',
	key: 'object',
	unique: 'boolean?',
	expireAfterSeconds: 'number?'
}]);

module.exports = class Schemas {

	static get schemasPath() {
		return SCHEMAS_PATH;
	}

	static get() {

		if(this._schemas)
			return this._schemas;

		try {

			this._schemas = require(this.constructor.schemasPath); // eslint-disable-line global-require, import/no-dynamic-require
			return this._schemas;

		} catch(err) {
			return undefined;
		}
	}

	static validate() {
		Object.values(this.schemas)
			.forEach(collections => this.validateCollections(collections));
	}

	static validateCollections(collections) {

		if(!isObject(collections)) {
			throw new MongodbIndexCreatorError('Invalid collections: Should exist and must be an object, also not an array.',
				MongodbIndexCreatorError.codes.INVALID_COLLECTIONS);
		}

		try {

			Object.values(collections)
				.forEach(collection => collectionStruct(collection));

		} catch(err) {

			throw new MongodbIndexCreatorError(`Invalid collection index: ${err.message}`,
				MongodbIndexCreatorError.codes.INVALID_COLLECTION_INDEXES);
		}
	}
};
