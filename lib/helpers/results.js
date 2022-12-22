'use strict';

const logger = require('lllog')();

module.exports = class Results {

	static save(action, result, model, indexName, errorMessage) {

		const key = model.clientCode || model.databaseKey;
		const { table } = model.constructor;

		if(!this.results)
			this.results = [];

		this.results.push({
			logType: result ? 'info' : 'error',
			message: `Collection '${key}.${table}' index '${indexName}' ${action} ${result ? 'success' : `error ${errorMessage || ''}`}`
		});
	}

	static export() {

		if(this.results?.length)
			return this.results.forEach(({ logType, message }) => logger[logType](message));

		logger.info('No changes applied');
	}
};
