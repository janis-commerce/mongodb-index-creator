
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
			INTERNAL_ERROR: 1,
			DROP_INDEX_ERROR: 2,
			CREATE_INDEX_ERROR: 3,
			REQUEST_ERROR: 2,
			PARSE_ERROR: 2,
		};
	}
};