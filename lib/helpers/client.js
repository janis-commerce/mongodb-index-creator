'use strict';

const path = require('path');

const MongodbIndexCreatorError = require('../mongodb-index-creator-error');

module.exports = class Client {

	static async get(code) {

		const filters = { ...code ? { code } : {} };
		
		const modelClient = this.getInstance();

		let clients;

		try {

			clients = await modelClient.get(filters);

		} catch(err) {
			throw new MongodbIndexCreatorError(`Unable to get the clients list: ${err.message}.`, MongodbIndexCreatorError.codes.MODEL_CLIENT_ERROR);
		}

		if(!clients.length) {
			logger.warn('MongodbIndexCreator - Operation skipped: No clients found.');
			return;
		}

		return clients;
	}

	/**
     * Returns an instance model from the service.
     */
	static getInstance() {

		if(!this._model) {
			const TheModelClass = this.getClass();
			this._model = new TheModelClass();
		}

		return this._model;
	}

	/**
	 * Returns a class model from the service
	 *
	 * @memberof InstanceGetter
	 */
	static getClass() {

		const modelPath = this.getRelativePath();

		try {
			// eslint-disable-next-line global-require, import/no-dynamic-require
			return require(modelPath);
		} catch(e) {
			throw new Error(`Invalid Model Client. Must be in ${modelPath}.`);
		}
	}

	static getRelativePath() {
		return path.join(process.cwd(), process.env.MS_PATH || '', 'models', 'client');
	}

};
