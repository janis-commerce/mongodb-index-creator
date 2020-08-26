'use strict';

module.exports = class Results {

	static save(name, type, data) {

		if(!this.results)
			this.results = {};

		if(!this.results[name])
			this.results[name] = {};

		this.results[name][type] = data;
	}

	static export() {
		return this.results
			? `Changes summary:\n${JSON.stringify(this.results, null, 2)}`
			: 'No changes applied';
	}
};
