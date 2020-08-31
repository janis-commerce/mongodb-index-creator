'use strict';

const path = require('path');
const logger = require('../colorful-lllog')();

module.exports = class Client {

	static async get(code) {

		const filters = { ...code ? { code } : {} };

		const modelClient = this.getInstance();

		if(!modelClient)
			return [];

		try {

			const clients = await modelClient.get(filters);
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
		return path.join(process.cwd(), process.env.MS_PATH || '', 'models', 'client');
	}

};
