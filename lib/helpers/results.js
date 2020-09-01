'use strict';

const merge = require('lodash.merge');

module.exports = class Results {

	static save(model, res, data) {

		const key = model.databaseKey;
		const operation = model.useReadDB ? 'read' : 'write';
		const { table } = model.constructor;

		let result = { [key]: { [operation]: { [table]: { [res]: data } } } };

		if(model.clientCode)
			result = { [model.clientCode]: { ...result } };

		if(!this.results)
			this.results = {};

		merge(this.results, result);
	}

	static export() {
		return this.results
			? `Changes summary:\n${JSON.stringify(this.results, null, 2)}`
			: 'No changes applied';
	}
};
