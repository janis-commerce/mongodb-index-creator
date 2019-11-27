'use strict';

const path = require('path');

const DatabaseDispatcher = require('@janiscommerce/database-dispatcher');

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

	_getMongoDbInstanceByKey(databaseKey) {

		const mongodbInstance = DatabaseDispatcher.getDatabaseByKey(databaseKey);

		if(mongodbInstance.constructor.name !== 'MongoDB') {
			throw new MongodbIndexCreatorError(`Invalid database type for databaseKey '${databaseKey}': Should be MongoDB.`,
				MongodbIndexCreatorError.codes.INVALID_DATABASE_TYPE);
		}

		return mongodbInstance;
	}

	_getMongoDbInstanceByClient(client, useReadDB) {

		const mongodbInstance = DatabaseDispatcher.getDatabaseByClient(client, useReadDB);

		if(mongodbInstance.constructor.name !== 'MongoDB') {
			throw new MongodbIndexCreatorError('Invalid database type for client: Should be MongoDB.',
				MongodbIndexCreatorError.codes.INVALID_DATABASE_TYPE);
		}

		return mongodbInstance;
	}

	async _getMongoDbConnection(mongodbInstance) {

		try {

			await mongodbInstance.checkConnection();

		} catch(err) {
			throw new MongodbIndexCreatorError(`Unable to connect to MongoDB: ${err.message}.`, MongodbIndexCreatorError.codes.MONGODB_CONNECTION_FAILED);
		}

		return mongodbInstance.db;
	}

	_validateCollections(collections) {

		if(!isObject(collections)) {
			throw new MongodbIndexCreatorError('Invalid collections: Should exist and must be an object, also not an array.',
				MongodbIndexCreatorError.codes.INVALID_COLLECTIONS);
		}

		Object.entries(collections).forEach(([collection, indexes]) => {

			if(!Array.isArray(indexes)) {
				throw new MongodbIndexCreatorError(`Invalid indexes for collection '${collection}': Should exist and must be an array.`,
					MongodbIndexCreatorError.codes.INVALID_COLLECTION_INDEXES);
			}

			indexes.forEach(index => {

				if(!isObject(index)) {
					throw new MongodbIndexCreatorError(`Invalid index for collection '${collection}': Should exist and must be an object.`,
						MongodbIndexCreatorError.codes.INVALID_COLLECTION_INDEXES);
				}

				if(!isObject(index.key)) {
					throw new MongodbIndexCreatorError(`Invalid index for collection '${collection}': Should have the key property and it must be an object.`,
						MongodbIndexCreatorError.codes.INVALID_COLLECTION_INDEXES);
				}
			});
		});
	}

	_prepareCoreIndexes(coreSchemas) {

		if(!isObject(coreSchemas)) {
			throw new MongodbIndexCreatorError('Invalid core schemas: Should exist and must be an object.',
				MongodbIndexCreatorError.codes.INVALID_CORE_SCHEMAS);
		}

		const coreIndexes = {};

		Object.entries(coreSchemas).forEach(([databaseKey, collections]) => {

			this._validateCollections(collections);

			coreIndexes[databaseKey] = {
				mongodbInstance: this._getMongoDbInstanceByKey(databaseKey),
				collections
			};
		});

		return coreIndexes;
	}

	async _prepareClientIndexes(clientSchemas) {

		if(!isObject(clientSchemas)) {
			throw new MongodbIndexCreatorError('Invalid client schemas: Should exist and must be an object.',
				MongodbIndexCreatorError.codes.INVALID_CLIENT_SCHEMAS);
		}

		this._validateCollections(clientSchemas);

		const clientIndexes = {};

		const modelClient = new ModelClient();

		let clients;

		try {

			clients = await modelClient.get();

		} catch(err) {
			throw new MongodbIndexCreatorError(`Unable to get the clients list: ${err.message}.`, MongodbIndexCreatorError.codes.MODEL_CLIENT_ERROR);
		}

		clients.forEach(client => {

			const mongoDbInstances = {
				write: this._getMongoDbInstanceByClient(client)
			};

			try {

				mongoDbInstances.read = this._getMongoDbInstanceByClient(client, true);

			} catch(err) { /* Should not throw when the read database config not exists */ }

			if(mongoDbInstances.read && areEqualObjects(mongoDbInstances.write.config, mongoDbInstances.read.config))
				delete mongoDbInstances.read;

			clientIndexes[client[ModelClient.identifierField]] = {
				mongoDbInstances,
				collections: clientSchemas
			};
		});

		return clientIndexes;
	}

	async _createIndexes(mongodbInstance, collections) {

		const mongoDbConnection = await this._getMongoDbConnection(mongodbInstance);

		const promises = [];

		Object.entries(collections).forEach(([collection, indexes]) => {

			const indexesToCreate = indexes.map(index => {

				const params = {};

				if(index.name)
					params.name = index.name;

				if(index.unique)
					params.unique = index.unique;

				return mongoDbConnection.collection(collection).createIndex(index.key, params);
			});

			promises.push(...indexesToCreate);
		});

		return Promise.all(promises);
	}

	async createCoreIndexes(coreSchemas) {

		const databases = this._prepareCoreIndexes(coreSchemas);

		const promises = Object.values(databases).map(({ mongodbInstance, collections }) => this._createIndexes(mongodbInstance, collections));

		return Promise.all(promises);
	}

	async createClientIndexes(clientSchemas) {

		const databases = await this._prepareClientIndexes(clientSchemas);

		const promises = Object.values(databases).reduce((prev, { mongoDbInstances, collections }) => {

			const promisesToAdd = [
				this._createIndexes(mongoDbInstances.write, collections)
			];

			if(mongoDbInstances.read)
				promisesToAdd.push(this._createIndexes(mongoDbInstances.read, collections));

			return [...prev, ...promisesToAdd];
		}, []);

		return Promise.all(promises);
	}

	async execute(coreSchemas = this.coreSchemas, clientSchemas = this.clientSchemas) {

		if(!coreSchemas && !clientSchemas)
			return logger.warn('Operation skipped: No indexes to create found.');

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
