'use strict';

const fs = require('fs');
const path = require('path');

const { ApiSession } = require('@janiscommerce/api-session');

const Settings = require('@janiscommerce/settings');

const logger = require('../colorful-lllog')();

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

		const models = [];
		const modelFiles = this.findModels();

		modelFiles.forEach(modelFile => {
			// eslint-disable-next-line global-require, import/no-dynamic-require
			const ModelClass = require(path.join(this.constructor.path, modelFile));
			models.push(...this.prepareModels(ModelClass));
		});

		return models;
	}

	findModels() {

		try {
			return fs.readdirSync(this.constructor.path);
		} catch(error) {
			logger.warn('MongodbIndexCreator - Operation skipped: No models found.');
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

			const clientModel = this.getInstance(ModelClass, client);

			clientsModels.push(clientModel);

			if(clientModel.hasReadDB())
				clientsModels.push(this.getInstance(ModelClass, client, true));

			return clientsModels;
		}, []);
	}

	isCoreDatabase(databaseKey) {
		return this.coreDatabasesKeys.includes(databaseKey);
	}

	getInstance(ModelClass, client, useReadDB) {

		const model = new ModelClass();

		model.useReadDB = !!useReadDB;

		if(client) {
			model.session = new ApiSession({}, client);
			model.clientCode = client.code;
		}

		return model;
	}

};
