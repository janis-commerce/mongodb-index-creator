'use strict';

const logger = require('./colorful-lllog')();
const serverlessFunction = require('./serverless-function');

const { Client, Indexes, Schemas, ModelGenerator, Results } = require('./helpers');

class MongodbIndexCreator {
	
	get schemas() {
		
		if(!this._schemas)
			this._schemas = Schemas.get();

		return this._schemas;
	}

	get clientDatabasesKeys() {
		return Object.keys(this.clients[0].databases);
	}

	async execute() {

		this.createCoreIndexes = true;

		logger.info('Creating indexes...');

		await this.executeForClientDatabases();

		logger.info('Indexes created successfully.');
		
		logger.info(Results.export());
	}

	async executeForClientDatabases() {

		this.clients = await Client.get();

		return this.createIndexes();
	}

	async executeForClientCode(code) {
	
		this.clients = await Client.get(code);
		
		return this.createIndexes();
	}

	async createIndexes() {

		console.log(this.schemas);

		if(!this.schemas)
			return logger.warn('MongodbIndexCreator - No indexes to create found.');

		Schemas.validate();

		if(!this.createCoreIndexes)
			this.filterOutCoreSchemas();

		const models = this.prepareModels();
	
		await Promise.all(
			models.map(({ model, indexes, name }) => Indexes.update(model, indexes, name))
		);

		await Promise.all(
			models.map(({ model, indexes, name }) => Indexes.update(model, indexes, name, true))
		);
	}

	prepareModels() {
		return Object.entries(this.schemas).reduce((models, [databaseKey, collections]) => {

			const isCoreDatabase = this.isCoreDatabase(databaseKey);

			if(!this.createCoreIndexes && isCoreDatabase)
				return;

			Object.entries(collections).forEach(([collection, indexes]) => {

				if(isCoreDatabase) {
					models.push(this.prepareModel(databaseKey, collection, indexes))
				} else {
					this.clients.forEach(client => {
						models.push(this.prepareModel(databaseKey, collection, indexes, client))
					});
				}
			});

		}, []);
	}

	prepareModel(databaseKey, collection, indexes, client) {
		return {
			name: `${databaseKey}.${collection}`,
			model: ModelGenerator.getInstance(databaseKey, collection, client),
			indexes
		};
	}

	isCoreDatabase(databaseKey) {
		return !this.clientDatabasesKeys.includes(databaseKey);
	}

	async createCoreIndexes() {

		const models = Indexes.prepareCoreIndexes(this.schemas.core);

		return Promise.all(
			models.map(({ modelInstance, indexes }) => this._updateIndexes(modelInstance, indexes))
		);
	}

	static get serverlessFunction() {
		return serverlessFunction;
	}
}

module.exports = MongodbIndexCreator;
