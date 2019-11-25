'use strict';

class MongodbIndexCreatorError extends Error {

	static get codes() {

		return {
			DATABASE_KEY_NOT_FOUND_IN_CONFIG: 1
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
