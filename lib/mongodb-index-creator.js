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

		logger.info(`Clients found ${this.clients && this.clients.length ? this.clients.length : 0}`);

		return this.createIndexes();
	}

	async executeForClientCode(code) {

		logger.info(`Getting client ${code}`);

		this.clients = await Client.get(code);

		if(this.clients && this.clients.length)
			logger.info(`Client ${code} found in core.clients`);
		else
			logger.warn(`Client ${code} not found in core.clients`);

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
