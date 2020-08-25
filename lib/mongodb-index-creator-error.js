'use strict';

module.exports = class MongodbIndexCreatorError extends Error {

	static get codes() {
		return {
			INVALID_COLLECTION_INDEXES: 1
		};
	}

	constructor(err, code) {
		super(err);
		this.message = err.message || err;
		this.code = code;
		this.name = 'MongodbIndexCreatorError';
	}
};
