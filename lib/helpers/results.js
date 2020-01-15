'use strict';

class ResultsHelper {

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
