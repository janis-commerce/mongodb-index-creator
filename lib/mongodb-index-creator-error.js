'use strict';

class MongodbIndexCreatorError extends Error {

	static get codes() {

		return {
			CORE_CONFIG_NOT_FOUND: 1,
			CLIENT_CONFIG_NOT_FOUND: 2,
			INVALID_CLIENT_CONFIG: 3,
			DATABASE_KEY_NOT_FOUND_IN_CONFIG: 4,
			MONGODB_CONNECTION_FAILED: 5,
			CORE_INDEXES_CREATE_FAILED: 6,
			CLIENT_INDEXES_CREATE_FAILED: 7,
			INVALID_CORE_SCHEMAS: 8,
			INVALID_CLIENT_SCHEMAS: 9,
			INVALID_PARAMETERS: 10,
			INVALID_COLLECTION_NAME: 11,
			INVALID_INDEXES: 12,
			INVALID_INDEX: 13,
			MODEL_CLIENT_ERROR: 14
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
