'use strict';

module.exports = class MongodbIndexCreatorError extends Error {
	constructor(err, code) {

		super(err.message || err);

		this.message = err.message || err;
		this.code = code;
		this.name = 'MongodbIndexCreatorError';

		if(err instanceof Error)
			this.previousError = err;
	}

	static get codes() {
		return {
			INVALID_INDEXES: 3
		};
	}
};
