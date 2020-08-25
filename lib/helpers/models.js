'use strict';

const fs = require('fs');
const path = require('path');

const logger = require('../colorful-lllog')();

module.exports = class Models {

	static get path() {
		return path.join(process.cwd(), process.env.MS_PATH || '', 'models');
	}

	static get clientDatabasesKeys() {
		return Object.keys(this.clients[0].databases);
	}

	static load(useCoreModels, clients) {

		this.useCoreModels = useCoreModels;
		this.clients = clients;

		const models = [];
		const modelsNames = this.findModels();

		modelsNames.forEach(modelName => {

			let ModelClass;

			try {

				// eslint-disable-next-line global-require, import/no-dynamic-require
				ModelClass = require(path.join(this.path, modelName));

			} catch(e) {
				/** nothing to do here */
			}

			if(ModelClass)
				models.push(...this.prepareModels(ModelClass));

		});

		return models;
	}

	findModels() {

		try {
			return fs.readdirSync(this.path);
		} catch(error) {
			logger.warn('MongodbIndexCreator - Operation skipped: No models found.');
			return [];
		}
	}

	prepareModels(ModelClass) {

		const model = new ModelClass();

		const isCoreDatabase = this.isCoreDatabase(model.databaseKey);

		if(isCoreDatabase && !!this.useCoreModels)
			return [];

		if(isCoreDatabase)
			return [model];

		return this.clients.reduce((clientsModels, client) => {

			const clientModel = new ModelClass();
			clientModel.session = { client };

			clientsModels.push(clientModel);

			if(clientModel.hasReadDB()) {
				clientsModels.push({
					...clientModel,
					useReadDB: true
				});
			}

			return clientsModels;
		}, []);
	}

	isCoreDatabase(databaseKey) {
		return !this.clientDatabasesKeys.includes(databaseKey);
	}

};
