'use strict';

const path = require('path');
const logger = require('lllog')();

module.exports = class Client {

	static async get(code) {

		const modelClient = this.getInstance();

		if(!modelClient)
			return [];

		try {

			const params = { fields: ['code'] };

			if(code)
				params.filters = { code };

			const clients = await modelClient.get(params);

			return clients;

		} catch(err) {
			/** nothing to do here */
			logger.error(`MongodbIndexCreator - Error getting clients: ${err.message}`);
		}
	}

	/**
     * Returns an instance model from the service.
     */
	static getInstance() {

		const modelPath = this.getRelativePath();

		try {
			// eslint-disable-next-line global-require, import/no-dynamic-require
			const TheModelClass = require(modelPath);
			return new TheModelClass();
		} catch(e) {
			/** nothing to do here */
		}
	}

	static getRelativePath() {
		/* istanbul ignore next */
		return path.join(process.cwd(), process.env.MS_PATH || '', 'models', 'client');
	}

};
