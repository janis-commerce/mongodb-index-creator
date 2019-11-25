'use strict';

const path = require('path');

const MongoDB = require('@janiscommerce/mongodb');
const Settings = require('@janiscommerce/settings');

const MongodbIndexCreatorError = require('./mongodb-index-creator-error');
const { isObject, areEqualObjects } = require('./utils/utils');
const ModelClient = require('./model-client');

const DEFAULT_SCHEMAS_PATH = path.join(process.cwd(), 'schemas', 'mongo');

class MongodbIndexCreator {

	constructor(schemasPath) {
		this.schemasPath = schemasPath || DEFAULT_SCHEMAS_PATH;
	}

	static get coreSettings() {

		if(this._coreSettings)
			return this._coreSettings;

		this.setCoreSettings();
		return this._coreSettings;
	}

	static get clientSettings() {

		if(this._clientSettings)
			return this._clientSettings;

		this.setClientSettings();
		return this._clientSettings;
	}

	static setCoreSettings() {
		this._coreSettings = Settings.get('database');
	}

	static setClientSettings() {
		const clientSettings = Settings.get('clients');
		this._clientSettings = clientSettings.database.fields;
	}

	static async createMongoDBConnection(config) {

		const mongoDbInstance = new MongoDB(config);
		await mongoDbInstance.checkConnection();

		return mongoDbInstance.db;
	}

	static buildCoreIndexes(coreIndexes) {

		const databases = {};

		Object.entries(coreIndexes).forEach(([databaseKey, collections]) => {

			const config = this.coreSettings[databaseKey];

			if(!isObject(config)) {
				throw new MongodbIndexCreatorError(`Invalid config or databaseKey: databaseKey '${databaseKey}' not found in config.`,
					MongodbIndexCreatorError.codes.DATABASE_KEY_NOT_FOUND_IN_CONFIG);
			}

			databases[databaseKey] = {

				config,
				collections
			};
		});

		return databases;
	}

	static _buildClientConfig(client) {

		const config = {};

		const clientSettings = {
			write: this.clientSettings.write
		};

		if(!areEqualObjects(clientSettings.write, this.clientSettings.read))
			clientSettings.read = this.clientSettings.read;

		Object.keys(clientSettings).forEach(dbType => {

			config[dbType] = {};

			Object.entries(this.clientSettings[dbType]).forEach(([clientField, driverField]) => {

				if(client[clientField] !== undefined)
					config[dbType][driverField] = client[clientField];
			});
		});

		return config;
	}

	static async buildClientIndexes(clientIndexes) {

		const databases = {};

		const modelClient = new ModelClient();

		const clients = await modelClient.get();

		clients.forEach(client => {

			databases[client[ModelClient.identifierField]] = {

				config: this._buildClientConfig(client),
				collections: clientIndexes
			};
		});

		return databases;
	}

	static async _createIndexes(config, collections) {

		const mongodb = await this.createMongoDBConnection(config);

		for(const [collection, { name, key, unique }] of Object.entries(collections)) {

			const params = {};

			if(name !== undefined)
				params.name = name;

			if(unique !== undefined)
				params.unique = unique;

			await mongodb.collection(collection).createIndex(key, params);
		}
	}

	async createCoreIndexes(coreIndexes) {

		const databases = this.constructor.buildCoreIndexes(coreIndexes);

		const promises = Object.values(databases).map(({ config, collections }) => this._createIndexes(config, collections));

		await Promise.all(promises);
	}

	async createClientIndexes(clientIndexes) {

		const databases = await this.constructor.buildClientIndexes(clientIndexes);

	}

	async execute(schemasPath = this.schemasPath) {

		let coreIndexes;
		let clientIndexes;


		try {

			/* eslint-disable global-require, import/no-dynamic-require */

			coreIndexes = require(path.join(schemasPath, 'core'));
			clientIndexes = require(path.join(schemasPath, 'clients'));

			/* eslint-enable global-require, import/no-dynamic-require */

		} catch(err) {
			// Should not throw when can't load any of the schemas
		}

		if(coreIndexes)
			await this.createCoreIndexes(coreIndexes);

		if(clientIndexes)
			await this.createClientIndexes(clientIndexes);
	}
}

module.exports = MongodbIndexCreator;
