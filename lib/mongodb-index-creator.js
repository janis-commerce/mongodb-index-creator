'use strict';

const path = require('path');

const DatabaseDispatcher = require('@janiscommerce/database-dispatcher');

const MongodbIndexCreatorError = require('./mongodb-index-creator-error');
const ModelClient = require('./model-client');

const { isObject, areEqualObjects } = require('./utils/utils');
const logger = require('./utils/colorful-lllog')();

const DEFAULT_SCHEMAS_PATH = path.join(process.cwd(), 'schemas', 'mongo');

class MongodbIndexCreator {

	constructor(schemasPath) {
		this.schemasPath = schemasPath || DEFAULT_SCHEMAS_PATH;
		this.results = {};
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

	_saveResults(database, results) {

		if(!this.results[database])
			this.results[database] = {};

		this.results[database] = {
			...this.results[database],
			...results
		};
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

		return mongodbInstance;
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

				if(typeof index.name !== 'string') {
					throw new MongodbIndexCreatorError(`Invalid index for collection '${collection}': Should have the name property and must be a string.`,
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

		return Object.entries(coreSchemas).map(([databaseKey, collections]) => {

			this._validateCollections(collections);

			return {
				mongodbInstance: this._getMongoDbInstanceByKey(databaseKey),
				collections
			};
		});
	}

	async _prepareClientIndexes(clients, clientSchemas) {

		if(!isObject(clientSchemas)) {
			throw new MongodbIndexCreatorError('Invalid client schemas: Should exist and must be an object.',
				MongodbIndexCreatorError.codes.INVALID_CLIENT_SCHEMAS);
		}

		this._validateCollections(clientSchemas);

		return clients.map(client => {

			const mongodbInstances = {
				write: this._getMongoDbInstanceByClient(client)
			};

			try {

				mongodbInstances.read = this._getMongoDbInstanceByClient(client, true);

			} catch(err) {
				// Should not throw when the read database config not exists
			}

			if(mongodbInstances.read && areEqualObjects(mongodbInstances.write.config, mongodbInstances.read.config))
				delete mongodbInstances.read;

			return {
				mongodbInstances,
				collections: clientSchemas
			};
		});
	}

	async _getCurrentIndexes(mongoDbConnection, collection) {

		const indexes = await mongoDbConnection.db.collection(collection).indexes();

		return indexes.map(({ key, name, unique }) => ({ key, name, unique }));
	}

	_getIndexesToDrop(currentIndexes, schemaIndexes) {

		const indexesToDrop = [];

		currentIndexes.forEach(currentIndex => {

			const exists = schemaIndexes.some(({ name }) => currentIndex.name === name);

			if(!exists)
				indexesToDrop.push(currentIndex);
		});

		return indexesToDrop;
	}

	_getIndexesToCreate(currentIndexes, schemaIndexes) {

		const indexesToCreate = [];

		schemaIndexes.forEach(schemaIndex => {

			const exists = currentIndexes.some(({ name }) => schemaIndex.name === name);

			if(!exists)
				indexesToCreate.push(schemaIndex);
		});

		return indexesToCreate;
	}

	async _dropCollectionIndexes(mongoDbConnection, collection, indexes) {

		const currentIndexes = await this._getCurrentIndexes(mongoDbConnection, collection);

		const indexesToDrop = this._getIndexesToDrop(currentIndexes, indexes);

		if(!indexesToDrop.length)
			return;

		this._saveResults(mongoDbConnection.config.database, {
			dropped: indexesToDrop.length
		});

		return mongoDbConnection.db
			.collection(collection)
			.dropIndexes(
				indexesToDrop.map(({ name }) => name)
			);
	}

	async _dropIndexes(mongodbInstance, collections) {

		const mongoDbConnection = await this._getMongoDbConnection(mongodbInstance);

		const promises = Object.entries(collections).map(([collection, indexes]) => {

			return this._dropCollectionIndexes(mongoDbConnection, collection, indexes);
		});

		return Promise.all(promises);
	}

	async _createCollectionIndexes(mongoDbConnection, collection, indexes) {

		const currentIndexes = await this._getCurrentIndexes(mongoDbConnection, collection);

		const indexesToCreate = this._getIndexesToCreate(currentIndexes, indexes);

		if(!indexesToCreate.length) {

			this._saveResults(mongoDbConnection.config.database, {
				skipped: indexes.length
			});

			return;
		}

		const promises = indexesToCreate.map(({ key, name, unique }) => {

			const params = { name };

			if(unique)
				params.unique = unique;

			return mongoDbConnection.db.collection(collection).createIndex(key, params);
		});

		this._saveResults(mongoDbConnection.config.database, {
			created: indexesToCreate.length,
			skipped: indexes.length - indexesToCreate.length
		});

		return Promise.all(promises);
	}

	async _createIndexes(mongodbInstance, collections) {

		const mongoDbConnection = await this._getMongoDbConnection(mongodbInstance);

		const promises = Object.entries(collections).map(([collection, indexes]) => {

			return this._createCollectionIndexes(mongoDbConnection, collection, indexes);
		});

		return Promise.all(promises);
	}

	async createCoreIndexes(coreSchemas) {

		const databases = this._prepareCoreIndexes(coreSchemas);

		const promises = [];

		databases.forEach(({ mongodbInstance, collections }) => {

			promises.push(
				this._dropIndexes(mongodbInstance, collections),
				this._createIndexes(mongodbInstance, collections)
			);
		});

		return Promise.all(promises);
	}

	async createClientIndexes(clients, clientSchemas) {

		const databases = await this._prepareClientIndexes(clients, clientSchemas);

		const promises = databases.reduce((prev, { mongodbInstances, collections }) => {

			const promisesToAdd = [
				this._dropIndexes(mongodbInstances.write, collections),
				this._createIndexes(mongodbInstances.write, collections)
			];

			if(mongodbInstances.read) {

				promisesToAdd.push(
					this._dropIndexes(mongodbInstances.read, collections),
					this._createIndexes(mongodbInstances.read, collections)
				);
			}

			return [...prev, ...promisesToAdd];
		}, []);

		return Promise.all(promises);
	}

	async executeByClientCode(clientCode, clientSchemas = this.clientSchemas) {

		const modelClient = new ModelClient();

		let client;

		try {

			client = await modelClient.getByClientCode(clientCode);

		} catch(err) {

			throw new MongodbIndexCreatorError(`Unable to get the client by code '${clientCode}': ${err.message}.`,
				MongodbIndexCreatorError.codes.MODEL_CLIENT_ERROR);
		}

		if(!client) {
			logger.warn(`Operation skipped: No client found with code '${clientCode}'.`);
			return;
		}

		logger.info(`Creating indexes for client '${clientCode}'...`);

		try {

			await this.createClientIndexes([client], clientSchemas);
			logger.info('Clients indexes created successfully.');

		} catch(err) {

			logger.error(err.message);

			throw new MongodbIndexCreatorError(`Unable to create client indexes: ${err.message}`,
				MongodbIndexCreatorError.codes.CLIENT_INDEXES_CREATE_FAILED);
		}

		logger.info(`Changes summary:\n${JSON.stringify(this.results, null, 2)}`);
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

				throw new MongodbIndexCreatorError(`Unable to create core indexes: ${err.message}`,
					MongodbIndexCreatorError.codes.CORE_INDEXES_CREATE_FAILED);
			}
		}

		if(clientSchemas) {

			const modelClient = new ModelClient();

			let clients;

			try {

				clients = await modelClient.get();

			} catch(err) {
				throw new MongodbIndexCreatorError(`Unable to get the clients list: ${err.message}.`, MongodbIndexCreatorError.codes.MODEL_CLIENT_ERROR);
			}

			logger.info('Creating client indexes...');

			try {

				await this.createClientIndexes(clients, clientSchemas);
				logger.info('Clients indexes created successfully.');

			} catch(err) {

				logger.error(err.message);

				throw new MongodbIndexCreatorError(`Unable to create client indexes: ${err.message}`,
					MongodbIndexCreatorError.codes.CLIENT_INDEXES_CREATE_FAILED);
			}
		}

		logger.info(`Changes summary:\n${JSON.stringify(this.results, null, 2)}`);
	}
}

module.exports = MongodbIndexCreator;
