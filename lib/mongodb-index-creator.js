'use strict';

const path = require('path');

const MongodbIndexCreatorError = require('./mongodb-index-creator-error');
const ModelClient = require('./model-client');

const { isObject, ModelGenerator } = require('./utils/utils');

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

	_saveResults(type, result) {

		if(this.results[type])
			this.results[type] += result;
		else
			this.results[type] = result;
	}

	_showResults() {
		logger.info(`Changes summary:\n${JSON.stringify(this.results, null, 2)}`);
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

	async _getCurrentIndexes(modelInstance) {

		const indexes = await modelInstance.getIndexes();

		return indexes.filter(({ name }) => name !== DEFAULT_ID_INDEX_NAME);
	}

	_getIndexesDifference(indexesA, indexesB) {
		return indexesA.filter(indexA => !indexesB.some(({ name }) => indexA.name === name));
	}

	async _createIndexes(modelInstance, currentIndexes, indexes) {

		const indexesToCreate = this._getIndexesDifference(indexes, currentIndexes);

		if(!indexesToCreate.length)
			return this._saveResults('skipped', indexes.length);

		this._saveResults('skipped', indexes.length - indexesToCreate.length);

		const result = await modelInstance.createIndexes(indexesToCreate);

		this._saveResults(
			result ? 'created' : 'createFailed',
			indexesToCreate.length
		);
	}

	async _dropIndexes(modelInstance, currentIndexes, indexes) {

		const indexesToDrop = this._getIndexesDifference(currentIndexes, indexes);

		if(!indexesToDrop.length)
			return;

		const result = await modelInstance.dropIndexes(
			indexesToDrop.map(({ name }) => name)
		);

		this._saveResults(
			result ? 'dropped' : 'dropFailed',
			indexesToDrop.length
		);
	}

	async _updateIndexes(modelInstance, indexes, useReadDB) {

		modelInstance.useReadDB = !!useReadDB; // false if useReadDB is false or not exists, true otherwise.

		const currentIndexes = await this._getCurrentIndexes(modelInstance);

		return Promise.all([
			this._createIndexes(modelInstance, currentIndexes, indexes),
			this._dropIndexes(modelInstance, currentIndexes, indexes)
		]);
	}

	_prepareCoreIndexes() {

		if(!isObject(this.coreSchemas)) {
			throw new MongodbIndexCreatorError('Invalid core schemas: Should exist and must be an object.',
				MongodbIndexCreatorError.codes.INVALID_CORE_SCHEMAS);
		}

		return Object.entries(this.coreSchemas).reduce((prev, [databaseKey, collections]) => {

			this._validateCollections(collections);

			return [
				...prev,
				...Object.entries(collections).map(([collection, indexes]) => (
					{
						modelInstance: ModelGenerator.getInstanceByDatabaseKey(databaseKey, collection),
						indexes
					}
				))
			];

		}, []);
	}

	_prepareClientIndexes(clients) {

		if(!isObject(this.clientSchemas)) {
			throw new MongodbIndexCreatorError('Invalid client schemas: Should exist and must be an object.',
				MongodbIndexCreatorError.codes.INVALID_CLIENT_SCHEMAS);
		}

		this._validateCollections(this.clientSchemas);

		return clients.reduce((prev, client) => {

			return [
				...prev,
				...Object.entries(this.clientSchemas).map(([collection, indexes]) => (
					{
						modelInstance: ModelGenerator.getSessionInstance(client, collection),
						indexes
					}
				))
			];

		}, []);
	}

	async createCoreIndexes() {

		const databases = this._prepareCoreIndexes();

		return Promise.all(
			databases.map(({ modelInstance, indexes }) => this._updateIndexes(modelInstance, indexes))
		);
	}

	async createClientIndexes(clients) {

		const databases = await this._prepareClientIndexes(clients);

		return Promise.all(

			databases.reduce((prev, { modelInstance, indexes }) => {

				return [
					...prev,
					this._updateIndexes(modelInstance, indexes),
					this._updateIndexes(modelInstance, indexes, true)
				];

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
