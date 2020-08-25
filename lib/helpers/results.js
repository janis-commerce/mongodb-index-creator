'use strict';

module.exports = class Results {

	static save(name, type, quantity) {

		if(!this.results)
			this.results = {};

		if(!this.results[name])
			this.results[name] = {};

		if(!this.results[name][type])
			this.results[name][type] = 0;

		this.results[name][type] += quantity;
	}

	static export() {
		return this.results
			? `Changes summary:\n${JSON.stringify(this.results, null, 2)}`
			: 'No changes applied';
	}
};
