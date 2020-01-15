'use strict';

const path = require('path');

const Collections = require('./collections');

const isObject = require('./is-object');

const MongodbIndexCreatorError = require('../mongodb-index-creator-error');

const DEFAULT_SCHEMAS_PATH = path.join(process.cwd(), 'schemas', 'mongo');

class SchemasHelper {

	constructor(schemasPath) {
		this.schemasPath = schemasPath || DEFAULT_SCHEMAS_PATH;
	}

	get core() {
		return this._getSchemas('core');
	}

	get client() {
		return this._getSchemas('clients');
	}

	validateCoreSchemas() {

		if(!isObject(this.core)) {
			throw new MongodbIndexCreatorError('Invalid core schemas: Should exist and must be an object.',
				MongodbIndexCreatorError.codes.INVALID_CORE_SCHEMAS);
		}

		Object.values(this.core).forEach(collections => Collections.validate(collections));
	}

	validateClientSchemas() {
		Collections.validate(this.client);
	}

	_getSchemas(type) {

		try {

			return require(path.join(this.schemasPath, type)); // eslint-disable-line global-require, import/no-dynamic-require

		} catch(err) {
			return undefined;
		}
	}
}

module.exports = SchemasHelper;
