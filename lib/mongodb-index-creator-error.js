'use strict';

class MongodbIndexCreatorError extends Error {

	static get codes() {

		return {
			CORE_CONFIG_NOT_FOUND: 1,
			CLIENT_CONFIG_NOT_FOUND: 2,
			INVALID_CLIENT_CONFIG: 3,
			INVALID_CLIENT_DATABASE_TYPE: 4,
			DATABASE_KEY_NOT_FOUND_IN_CONFIG: 5,
			MONGODB_CONNECTION_FAILED: 6,
			CORE_INDEXES_CREATE_FAILED: 7,
			CLIENT_INDEXES_CREATE_FAILED: 8,
			INVALID_CORE_SCHEMAS: 9,
			INVALID_CLIENT_SCHEMAS: 10,
			INVALID_COLLECTION_INDEXES: 11,
			MODEL_CLIENT_ERROR: 12
		};

	}

	constructor(err, code) {
		super(err);
		this.message = err.message || err;
		this.code = code;
		this.name = 'MongodbIndexCreatorError';
	}
}

module.exports = MongodbIndexCreatorError;
