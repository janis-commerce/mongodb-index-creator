'use strict';

class MongodbIndexCreatorError extends Error {

	static get codes() {

		return {
			INVALID_DATABASE_TYPE: 1,
			MONGODB_CONNECTION_FAILED: 2,
			INVALID_CORE_SCHEMAS: 3,
			INVALID_CLIENT_SCHEMAS: 4,
			INVALID_COLLECTIONS: 5,
			INVALID_COLLECTION_INDEXES: 6,
			MODEL_CLIENT_ERROR: 7
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
