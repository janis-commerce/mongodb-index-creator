'use strict';

module.exports = class Results {

	static save(model, operationResult, indexName) {

		const key = model.clientCode || model.databaseKey;
		const { table } = model.constructor;

		if(!this.results)
			this.results = {};

		if(!this.results[key])
			this.results[key] = {};

		if(!this.results[key][table])
			this.results[key][table] = {};

		if(!this.results[key][table][operationResult])
			this.results[key][table][operationResult] = [];

		this.results[key][table][operationResult].push(indexName);
	}

	static export() {
		return this.results
			? `Changes summary:\n${JSON.stringify(this.results, null, 2)}`
			: 'No changes applied';
	}
};
