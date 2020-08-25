'use strict';

class MongodbIndexCreatorError extends Error {

	static get codes() {

		return {
			INVALID_DATABASE_TYPE: 1,
			MONGODB_CONNECTION_FAILED: 2,
			INVALID_COLLECTIONS: 3,
			INVALID_COLLECTION_INDEXES: 4,
			MODEL_CLIENT_ERROR: 5
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
