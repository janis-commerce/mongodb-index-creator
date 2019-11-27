'use strict';

const path = require('path');

const MongoDB = require('@janiscommerce/mongodb');
const Settings = require('@janiscommerce/settings');

const MongodbIndexCreatorError = require('./mongodb-index-creator-error');
const { isObject, areEqualObjects } = require('./utils/utils');
const logger = require('./utils/colorful-lllog')();
const ModelClient = require('./model-client');

const DEFAULT_SCHEMAS_PATH = path.join(process.cwd(), 'schemas', 'mongo');

class MongodbIndexCreator {

	constructor(schemasPath) {
		this.schemasPath = schemasPath || DEFAULT_SCHEMAS_PATH;
	}

	get coreSchemas() {

		try {

			return require(path.join(this.schemasPath, 'core')); // eslint-disable-line global-require, import/no-dynamic-require

		} catch(err) {
			return undefined;
		}
	}

	get clientSchemas() {

		try {

			return require(path.join(this.schemasPath, 'clients')); // eslint-disable-line global-require, import/no-dynamic-require

		} catch(err) {
			return undefined;
		}
	}

	get coreSettings() {

		if(this._coreSettings)
			return this._coreSettings;

		this.setCoreSettings();
		return this._coreSettings;
	}

	get clientSettings() {

		if(this._clientSettings)
			return this._clientSettings;

		this.setClientSettings();
		return this._clientSettings;
	}

	setCoreSettings() {

		const coreSettings = Settings.get('database');

		if(!isObject(coreSettings))
			throw new MongodbIndexCreatorError('Config for core databases not found.', MongodbIndexCreatorError.codes.CORE_CONFIG_NOT_FOUND);

		this._coreSettings = coreSettings;
	}

	setClientSettings() {

		const clientSettings = Settings.get('clients');

		if(!isObject(clientSettings))
			throw new MongodbIndexCreatorError('Config for client databases not found.', MongodbIndexCreatorError.codes.CLIENT_CONFIG_NOT_FOUND);

		if(!isObject(clientSettings.database) || !isObject(clientSettings.database.fields)) {

			throw new MongodbIndexCreatorError('Invalid client database config: Should have the database fields with read and or write config',
				MongodbIndexCreatorError.codes.INVALID_CLIENT_CONFIG);
		}

		this._clientSettings = clientSettings.database.fields;
	}

	async _createMongoDBConnection(config) {

		try {

			const mongoDbInstance = new MongoDB(config);

			await mongoDbInstance.checkConnection();

			return mongoDbInstance.db;

		} catch(err) {
			throw new MongodbIndexCreatorError(`Unable to connect to MongoDB: ${err.message}`, MongodbIndexCreatorError.codes.MONGODB_CONNECTION_FAILED);
		}
	}

	_formatCoreSchemas(coreSchemas) {

		if(!isObject(coreSchemas)) {
			throw new MongodbIndexCreatorError('Invalid core schemas: Should exist and must be an object.',
				MongodbIndexCreatorError.codes.INVALID_CORE_SCHEMAS);
		}

		const databases = {};

		Object.entries(coreSchemas).forEach(([databaseKey, collections]) => {

			const config = this.coreSettings[databaseKey];

			if(!isObject(config)) {
				throw new MongodbIndexCreatorError(`Invalid config or databaseKey: databaseKey '${databaseKey}' not found in config.`,
					MongodbIndexCreatorError.codes.DATABASE_KEY_NOT_FOUND_IN_CONFIG);
			}

			if(!isObject(collections)) {
				throw new MongodbIndexCreatorError(`Invalid '${databaseKey}' collections: Should exist and must be an object.`,
					MongodbIndexCreatorError.codes.INVALID_CORE_SCHEMAS);
			}

			databases[databaseKey] = {
				config,
				collections
			};
		});

		return databases;
	}

	async _formatClientSchemas(clientSchemas) {

		if(!isObject(clientSchemas)) {
			throw new MongodbIndexCreatorError('Invalid client schemas: Should exist and must be an object.',
				MongodbIndexCreatorError.codes.INVALID_CLIENT_SCHEMAS);
		}

		const databases = {};

		const modelClient = new ModelClient();

		try {

			const clients = await modelClient.get();

			clients.forEach(client => {

				databases[client[ModelClient.identifierField]] = {
					config: this._buildClientConfig(client),
					collections: clientSchemas
				};
			});
		} catch(err) {
			throw new MongodbIndexCreatorError(`Unable to get the clients list: ${err.message}.`, MongodbIndexCreatorError.codes.MODEL_CLIENT_ERROR);
		}

		return databases;
	}

	_buildClientConfig(client) {

		const config = {};

		const clientSettings = {
			write: this.clientSettings.write
		};

		if(!areEqualObjects(clientSettings.write, this.clientSettings.read))
			clientSettings.read = this.clientSettings.read;

		Object.keys(clientSettings).forEach(dbType => {

			config[dbType] = {};

			Object.entries(this.clientSettings[dbType]).forEach(([clientField, driverField]) => {

				if(client[clientField])
					config[dbType][driverField] = client[clientField];
			});
		});

		return config;
	}

	async _createIndexes(config, collections) {

		const mongodb = await this._createMongoDBConnection(config);

		const promises = [];

		Object.entries(collections).forEach(([collection, indexes]) => {

			if(!Array.isArray(indexes)) {
				throw new MongodbIndexCreatorError(`Invalid indexes for collection '${collection}': Should exist and must be an array.`,
					MongodbIndexCreatorError.codes.INVALID_COLLECTION_INDEXES);
			}

			const indexesToCreate = indexes.map(index => {

				if(!isObject(index)) {
					throw new MongodbIndexCreatorError(`Invalid index for collection '${collection}': Should exist and must be an object.`,
						MongodbIndexCreatorError.codes.INVALID_COLLECTION_INDEXES);
				}

				const { name, key, unique } = index;

				if(!isObject(key)) {
					throw new MongodbIndexCreatorError(`Invalid index for collection '${collection}': Should have the key property and it must be an object.`,
						MongodbIndexCreatorError.codes.INVALID_COLLECTION_INDEXES);
				}

				const params = {};

				if(name)
					params.name = name;

				if(unique)
					params.unique = unique;

				return mongodb.collection(collection).createIndex(key, params);
			});

			promises.push(...indexesToCreate);
		});

		return Promise.all(promises);
	}

	async createCoreIndexes(coreSchemas) {

		const databases = this._formatCoreSchemas(coreSchemas);

		const promises = Object.values(databases).map(({ config, collections }) => this._createIndexes(config, collections));

		return Promise.all(promises);
	}

	async createClientIndexes(clientSchemas) {

		const databases = await this._formatClientSchemas(clientSchemas);

		const promises = Object.values(databases).reduce((prev, { config, collections }) => {

			const promisesToAdd = [];

			if(config.write)
				promisesToAdd.push(this._createIndexes(config.write, collections));

			if(config.read)
				promisesToAdd.push(this._createIndexes(config.read, collections));

			return [...prev, ...promisesToAdd];
		}, []);

		return Promise.all(promises);
	}

	async execute(coreSchemas = this.coreSchemas, clientSchemas = this.clientSchemas) {

		if(!coreSchemas && !clientSchemas)
			return logger.warn('Operation aborted: No indexes to create found.');

		if(coreSchemas) {

			logger.info('Creating core indexes...');

			try {

				await this.createCoreIndexes(coreSchemas);
				logger.info('Core indexes created successfully.');

			} catch(err) {
				logger.error(err.message);
				throw new MongodbIndexCreatorError(`Unable to create core indexes: ${err.message}`, MongodbIndexCreatorError.CORE_INDEXES_CREATE_FAILED);
			}
		}

		if(clientSchemas) {

			logger.info('Creating client indexes...');

			try {

				await this.createClientIndexes(clientSchemas);
				logger.info('Clients indexes created successfully.');

			} catch(err) {
				logger.error(err.message);
				throw new MongodbIndexCreatorError(`Unable to create client indexes: ${err.message}`, MongodbIndexCreatorError.CLIENT_INDEXES_CREATE_FAILED);
			}
		}
	}
}

module.exports = MongodbIndexCreator;
