'use strict';

const fs = require('fs');
const path = require('path');

const { ApiSession } = require('@janiscommerce/api-session');

const Settings = require('@janiscommerce/settings');

const logger = require('lllog')();

module.exports = class ModelHelper {

	static get path() {
		return path.join(process.cwd(), process.env.MS_PATH || '', 'models');
	}

	get coreDatabasesKeys() {

		if(!this._coreDatabasesKeys)
			this._coreDatabasesKeys = Object.keys(Settings.get('database') || {});

		return this._coreDatabasesKeys;
	}

	constructor(useCoreModels, clients) {
		this.useCoreModels = useCoreModels;
		this.clients = clients || [];
	}

	getModels() {

		const modelFiles = this.findModels();

		return modelFiles.reduce((models, modelFile) => {

			// eslint-disable-next-line global-require, import/no-dynamic-require
			const ModelClass = require(path.join(this.constructor.path, modelFile));

			models.push(...this.prepareModels(ModelClass));

			return models;
		}, []);
	}

	findModels() {

		try {
			return fs.readdirSync(this.constructor.path);
		} catch(error) {
			logger.warn('Operation skipped: No models found.');
			return [];
		}
	}

	prepareModels(ModelClass) {

		const model = this.getInstance(ModelClass);

		const isCoreDatabase = this.isCoreDatabase(model.databaseKey);

		if(isCoreDatabase && !this.useCoreModels)
			return [];

		if(isCoreDatabase)
			return [model];

		return this.clients.reduce((clientsModels, client) => {

			clientsModels.push(this.getInstance(ModelClass, client));

			return clientsModels;
		}, []);
	}

	isCoreDatabase(databaseKey) {
		return this.coreDatabasesKeys.includes(databaseKey);
	}

	getInstance(ModelClass, client) {

		const model = new ModelClass();

		if(client) {
			model.session = new ApiSession({}, client);
			model.clientCode = client.code;
		}

		return model;
	}

};
