'use strict';

class ResultsHelper {

	/**
	 * Save the results of the specified type, if the type already have a value it will be joined
	 * @param {String} type The result type, such as: created, failed, etc...
	 * @param {Number} result The result values to save
	 */
	static save(type, result) {

		if(!this.results)
			this.results = {};

		if(this.results[type])
			this.results[type] += result;
		else
			this.results[type] = result;
	}

	static export() {
		return `Changes summary:\n${JSON.stringify(this.results, null, 2)}`;
	}
}

module.exports = ResultsHelper;
