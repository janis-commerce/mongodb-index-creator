'use strict';

const logger = require('./colorful-lllog')();
const serverlessFunction = require('./serverless-function');

const { Client, Models, Indexes, Results } = require('./helpers');

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

		return this.createIndexes();
	}

	async executeForClientCode(code) {

		logger.info(`Getting client ${code}`);

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
