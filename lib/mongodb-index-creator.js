'use strict';

const MongodbIndexCreatorError = require('./mongodb-index-creator-error');
const ModelClient = require('./model-client');
const logger = require('./colorful-lllog')();

const Indexes = require('./helpers/indexes');
const Schemas = require('./helpers/schemas');
const Results = require('./helpers/results');


class MongodbIndexCreator {

	constructor(schemasPath) {
		this.schemas = new Schemas(schemasPath);
	}

	async _createIndexes(modelInstance, currentIndexes, indexes) {

		const indexesToCreate = Indexes.getIndexesDifference(indexes, currentIndexes);

		if(!indexesToCreate.length)
			return Results.save('skipped', indexes.length);

		Results.save('skipped', indexes.length - indexesToCreate.length);

		const result = await modelInstance.createIndexes(indexesToCreate);

		Results.save(
			result ? 'created' : 'createFailed',
			indexesToCreate.length
		);
	}

	async _dropIndexes(modelInstance, currentIndexes, indexes) {

		const indexesToDrop = Indexes.getIndexesDifference(currentIndexes, indexes);

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

	async _updateIndexes(modelInstance, indexes, useReadDB) {

		modelInstance.useReadDB = !!useReadDB; // false if useReadDB is false or not exists, true otherwise.

		const currentIndexes = await Indexes.get(modelInstance);

		return Promise.all([
			this._createIndexes(modelInstance, currentIndexes, indexes),
			this._dropIndexes(modelInstance, currentIndexes, indexes)
		]);
	}

	async createCoreIndexes() {

		const models = Indexes.prepareCoreIndexes(this.schemas.core);

		return Promise.all(
			models.map(({ modelInstance, indexes }) => this._updateIndexes(modelInstance, indexes))
		);
	}

	async createClientIndexes(clients) {

		const models = await Indexes.prepareClientIndexes(clients, this.schemas.client);

		return Promise.all(

			models.reduce((prev, { modelInstance, indexes }) => {

				return [
					...prev,
					this._updateIndexes(modelInstance, indexes),
					this._updateIndexes(modelInstance, indexes, true)
				];

			}, [])
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

	async execute() {

		await Promise.all([
			this.executeForCoreDatabases(),
			this.executeForClientDatabases()
		]);

		logger.info(Results.export());
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
}

module.exports = MongodbIndexCreator;
