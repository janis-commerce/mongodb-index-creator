'use strict';

const logger = require('./colorful-lllog')();
const serverlessFunction = require('./serverless-function');

const { Client, Models, Indexes, Results } = require('./helpers');

module.exports = class MongodbIndexCreator {

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

		const models = Models.load(!!this.createCoreIndexes, this.clients);

		return Promise.all(models.map(model => Indexes.process(model)));
	}

	static get serverlessFunction() {
		return serverlessFunction;
	}
};
