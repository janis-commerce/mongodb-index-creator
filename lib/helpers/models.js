'use strict';

const fs = require('fs');
const path = require('path');

const { ApiSession } = require('@janiscommerce/api-session');

const logger = require('../colorful-lllog')();

module.exports = class Models {

	static get path() {
		return path.join(process.cwd(), process.env.MS_PATH || '', 'models');
	}

	static get clientDatabasesKeys() {
		return this.clients.length && this.clients[0].databases ? Object.keys(this.clients[0].databases) : [];
	}

	static load(useCoreModels, clients) {

		this.useCoreModels = useCoreModels;
		this.clients = clients || [];

		const models = [];
		const modelsNames = this.findModels();

		modelsNames.forEach(modelName => {
			// eslint-disable-next-line global-require, import/no-dynamic-require
			const ModelClass = require(path.join(this.path, modelName));
			models.push(...this.prepareModels(ModelClass));
		});

		return models;
	}

	static findModels() {

		try {
			return fs.readdirSync(this.path);
		} catch(error) {
			logger.warn('MongodbIndexCreator - Operation skipped: No models found.');
			return [];
		}
	}

	static prepareModels(ModelClass) {

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

	static isCoreDatabase(databaseKey) {
		return !this.clientDatabasesKeys.includes(databaseKey);
	}

	static getInstance(ModelClass, client, useReadDB) {

		const model = new ModelClass();

		model.useReadDB = !!useReadDB;

		if(client) {
			model.session = new ApiSession({ clientCode: client.code });
			model.clientCode = client.code;
		}

		return model;
	}

};
