'use strict';

const Settings = require('@janiscommerce/settings');

const MongodbIndexCreatorError = require('./mongodb-index-creator-error');
const ModelClient = require('./model-client');
const logger = require('./colorful-lllog')();
const serverlessFunction = require('./serverless-function');
const Indexes = require('./helpers/indexes');
const Schemas = require('./helpers/schemas');
const Results = require('./helpers/results');

class MongodbIndexCreator {

	constructor(schemasPath) {
		this.schemas = new Schemas(schemasPath);
	}

	async execute() {

		await Promise.all([
			this.executeForCoreDatabases(),
			this.executeForClientDatabases()
		]);

		logger.info(Results.export());
	}

	async createCoreIndexes() {

		this.schemas.validateCoreSchemas();

		const models = Indexes.prepareCoreIndexes(this.schemas.core);

		return Promise.all(
			models.map(({ modelInstance, indexes }) => this._updateIndexes(modelInstance, indexes))
		);
	}

	async createClientIndexes(clients) {

		this.schemas.validateClientSchemas();

		const models = await Indexes.prepareClientIndexes(clients, this.schemas.client);

		const shouldUseReadDB = Settings.get('databaseReadType');

		return Promise.all(

			models.map(({ modelInstance, indexes }) => {

				// Should update the indexes sequentially for write and read db
				// Due the usage of the same model instance causes a duplicated update in same db type instead
				const process = async () => {

					await this._updateIndexes(modelInstance, indexes);

					if(shouldUseReadDB)
						return this._updateIndexes(modelInstance, indexes, true);
				};

				return process();
			})
		);
	}

	async executeForCoreDatabases() {

		if(!this.schemas.core)
			return logger.warn('Operation skipped: No core indexes to create found.');

		logger.info('Creating core indexes...');

		await this.createCoreIndexes();

		logger.info('Core indexes created successfully.');
	}

	async executeForClientDatabases() {

		if(!this.schemas.client)
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

	async executeForClientCode(clientCode) {

		if(!this.schemas.client)
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

		logger.info(Results.export());
	}

	async _updateIndexes(modelInstance, indexes, useReadDB) {

		modelInstance.useReadDB = !!useReadDB; // false if useReadDB is false or not exists, true otherwise.

		const currentIndexes = await Indexes.get(modelInstance);

		return Promise.all([
			this._dropIndexes(modelInstance, currentIndexes, indexes),
			this._createIndexes(modelInstance, currentIndexes, indexes)
		]);
	}

	async _createIndexes(modelInstance, currentIndexes, indexes) {

		const indexesToCreate = Indexes.difference(indexes, currentIndexes);

		Results.save('skipped', indexes.length - indexesToCreate.length);

		if(!indexesToCreate.length)
			return;

		const result = await modelInstance.createIndexes(indexesToCreate);

		Results.save(
			result ? 'created' : 'createFailed',
			indexesToCreate.length
		);
	}

	async _dropIndexes(modelInstance, currentIndexes, indexes) {

		const indexesToDrop = Indexes.difference(currentIndexes, indexes);

		if(!indexesToDrop.length)
			return;

		const result = await modelInstance.dropIndexes(
			indexesToDrop.map(({ name }) => name)
		);

		Results.save(
			result ? 'dropped' : 'dropFailed',
			indexesToDrop.length
		);
	}

	static get serverlessFunction() {
		return serverlessFunction;
	}
}

module.exports = MongodbIndexCreator;
