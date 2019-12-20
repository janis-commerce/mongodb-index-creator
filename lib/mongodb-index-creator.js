'use strict';

const path = require('path');

const DatabaseDispatcher = require('@janiscommerce/database-dispatcher');

const MongodbIndexCreatorError = require('./mongodb-index-creator-error');
const ModelClient = require('./model-client');

const { isObject, areEqualObjects } = require('./utils/utils');
const logger = require('./utils/colorful-lllog')();

const DEFAULT_SCHEMAS_PATH = path.join(process.cwd(), 'schemas', 'mongo');

const DEFAULT_ID_INDEX_NAME = '_id_';

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

	_showResults() {
		logger.info(`Changes summary:\n${JSON.stringify(this.results, null, 2)}`);
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

	_prepareCoreIndexes() {

		if(!isObject(this.coreSchemas)) {
			throw new MongodbIndexCreatorError('Invalid core schemas: Should exist and must be an object.',
				MongodbIndexCreatorError.codes.INVALID_CORE_SCHEMAS);
		}

		return Object.entries(this.coreSchemas).map(([databaseKey, collections]) => {

			this._validateCollections(collections);

			return {
				mongodbInstance: this._getMongoDbInstanceByKey(databaseKey),
				collections
			};
		});
	}

	async _prepareClientIndexes(clients) {

		if(!isObject(this.clientSchemas)) {
			throw new MongodbIndexCreatorError('Invalid client schemas: Should exist and must be an object.',
				MongodbIndexCreatorError.codes.INVALID_CLIENT_SCHEMAS);
		}

		this._validateCollections(this.clientSchemas);

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
				collections: this.clientSchemas
			};
		});
	}

	async _getCurrentIndexes(mongodbConnection, collection) {

		const indexes = await mongodbConnection.db.collection(collection).indexes();

		if(!Array.isArray(indexes))
			return [];

		return indexes.map(({ key, name, unique }) => ({ key, name, unique })).filter(({ name }) => name !== DEFAULT_ID_INDEX_NAME);
	}

	_getIndexesDifference(indexesA, indexesB) {
		return indexesA.filter(indexA => !indexesB.some(({ name }) => indexA.name === name));
	}

	async _updateCollectionIndexes(mongodbConnection, collection, indexes) {

		const currentIndexes = await this._getCurrentIndexes(mongodbConnection, collection);

		return Promise.all([
			this._createCollectionIndexes(mongodbConnection, collection, currentIndexes, indexes),
			this._dropCollectionIndexes(mongodbConnection, collection, currentIndexes, indexes)
		]);
	}

	async _dropCollectionIndexes(mongodbConnection, collection, currentIndexes, indexes) {

		const indexesToDrop = this._getIndexesDifference(currentIndexes, indexes);

		if(!indexesToDrop.length)
			return;

		this._saveResults(mongodbConnection.config.database, {
			dropped: indexesToDrop.length
		});

		return mongodbConnection.db
			.collection(collection)
			.dropIndexes(
				indexesToDrop.map(({ name }) => name)
			);
	}

	async _createCollectionIndexes(mongodbConnection, collection, currentIndexes, indexes) {

		const indexesToCreate = this._getIndexesDifference(indexes, currentIndexes);

		if(!indexesToCreate.length) {

			this._saveResults(mongodbConnection.config.database, {
				skipped: indexes.length
			});

			return;
		}

		this._saveResults(mongodbConnection.config.database, {
			created: indexesToCreate.length,
			skipped: indexes.length - indexesToCreate.length
		});

		return Promise.all(

			indexesToCreate.map(({ key, name, unique }) => {

				const params = { name };

				if(unique)
					params.unique = unique;

				return mongodbConnection.db.collection(collection).createIndex(key, params);
			})
		);
	}

	async _updateIndexes(mongodbInstance, collections) {

		const mongodbConnection = await this._getMongoDbConnection(mongodbInstance);

		return Promise.all(
			Object.entries(collections).map(([collection, indexes]) => (
				this._updateCollectionIndexes(mongodbConnection, collection, indexes)
			))
		);
	}

	async createCoreIndexes() {

		const databases = this._prepareCoreIndexes();

		return Promise.all(
			databases.reduce((prev, { mongodbInstance, collections }) => (
				[...prev, this._updateIndexes(mongodbInstance, collections)]
			), [])
		);
	}

	async createClientIndexes(clients) {

		const databases = await this._prepareClientIndexes(clients);

		return Promise.all(

			databases.reduce((prev, { mongodbInstances, collections }) => {

				const promisesToAdd = [
					this._updateIndexes(mongodbInstances.write, collections)
				];

				if(mongodbInstances.read) {

					promisesToAdd.push(
						this._updateIndexes(mongodbInstances.read, collections)
					);
				}

				return [...prev, ...promisesToAdd];
			}, [])
		);
	}

	async executeForCoreDatabases() {

		if(!this.coreSchemas)
			return logger.warn('Operation skipped: No core indexes to create found.');

		logger.info('Creating core indexes...');

		await this.createCoreIndexes();

		logger.info('Core indexes created successfully.');
	}

	async executeForClientDatabases() {

		if(!this.clientSchemas)
			return logger.warn('Operation skipped: No client indexes to create found.');

		const modelClient = new ModelClient();

		let clients;

		try {

			clients = await modelClient.get();

		} catch(err) {
			throw new MongodbIndexCreatorError(`Unable to get the clients list: ${err.message}.`, MongodbIndexCreatorError.codes.MODEL_CLIENT_ERROR);
		}

		if(!clients.length) {
			logger.warn('Operation skipped: No clients found.');
			return;
		}

		logger.info('Creating client indexes...');

		await this.createClientIndexes(clients);

		logger.info('Clients indexes created successfully.');
	}

	async execute() {

		await Promise.all([
			this.executeForCoreDatabases(),
			this.executeForClientDatabases()
		]);

		this._showResults();
	}

	async executeForClientCode(clientCode) {

		if(!this.clientSchemas)
			return logger.warn('Operation skipped: No client indexes to create found.');

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

		await this.createClientIndexes([client]);

		logger.info('Clients indexes created successfully.');

		this._showResults();
	}
}

module.exports = MongodbIndexCreator;
