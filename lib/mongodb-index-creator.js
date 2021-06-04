'use strict';

const logger = require('./colorful-lllog')();
const serverlessFunction = require('./serverless-function');

const { Client, ModelHelper, IndexHelper, Results } = require('./helpers');

module.exports = class MongodbIndexCreator {

	async execute() {

		this.createCoreIndexes = true;

		logger.info('Processing indexes');

		await this.executeForClientDatabases();

		logger.info(Results.export());
	}

	async executeForClientDatabases() {

		logger.info('Getting clients');

		this.clients = await Client.get();

		logger.info(`Clients found ${(this.clients && this.clients.length) || 0}`);

		await this.createIndexes();
	}

	async executeForClientCode(code) {

		logger.info(`Getting client ${code}`);

		this.clients = await Client.get(code);

		if(!this.clients || !this.clients.length)
			return logger.warn(`Operation skipped: Client ${code} not found in core.clients`);

		logger.info(`Client ${code} found in core.clients`);

		await this.createIndexes();
	}

	async createIndexes() {

		const modelHelper = new ModelHelper(!!this.createCoreIndexes, this.clients);

		const models = modelHelper.getModels();

		await Promise.all(models.map(model => {
			try {
				const indexHelper = new IndexHelper(model);
				return indexHelper.process();
			} catch(err) {
				return logger.error(err.message);
			}
		}));
	}

	static get serverlessFunction() {
		return serverlessFunction;
	}
};
