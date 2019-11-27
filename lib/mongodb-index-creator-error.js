'use strict';

class MongodbIndexCreatorError extends Error {

	static get codes() {

		return {
			INVALID_DATABASE_TYPE: 1,
			MONGODB_CONNECTION_FAILED: 2,
			CORE_INDEXES_CREATE_FAILED: 3,
			CLIENT_INDEXES_CREATE_FAILED: 4,
			INVALID_CORE_SCHEMAS: 5,
			INVALID_CLIENT_SCHEMAS: 6,
			INVALID_COLLECTIONS: 7,
			INVALID_COLLECTION_INDEXES: 8,
			MODEL_CLIENT_ERROR: 9
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
