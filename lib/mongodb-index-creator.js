'use strict';

const { Lambda } = require('@janiscommerce/lambda');

const { struct } = require('@janiscommerce/superstruct');

const logger = require('lllog')();

const { Client, ModelHelper, IndexHelper, Results } = require('./helpers');

module.exports = class MongoDBIndexCreator extends Lambda {

	get struct() {
		return struct.optional({
			clientCode: struct.union(['string?', 'array?'])
		});
	}

	async process() {

		this.createCoreIndexes = !this.data?.clientCode;

		await this.setClients();

		this.setModels();

		await this.createIndexes();

		Results.export();
	}

	async setClients() {

		this.clients = await Client.get(this.data?.clientCode);

		logger.info(`Clients found ${(this.clients && this.clients.length) || 0}`);
	}

	setModels() {
		const modelHelper = new ModelHelper(!!this.createCoreIndexes, this.clients);

		this.models = modelHelper.getModels();
	}

	async createIndexes() {

		if(!this.models.length)
			return;

		const [model] = this.models.splice(0, 1);

		const indexHelper = new IndexHelper(model);
		await indexHelper.process();

		return this.createIndexes();
	}
};
