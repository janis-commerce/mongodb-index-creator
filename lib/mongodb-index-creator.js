'use strict';

const { Lambda } = require('@janiscommerce/lambda');

const { ApiSession } = require('@janiscommerce/api-session');

const { struct } = require('@janiscommerce/superstruct');

const logger = require('lllog')();

const { Client, ModelHelper, IndexHelper } = require('./helpers');
const arrayChunk = require('./helpers/array-chunk');

module.exports = class MongoDBIndexCreator extends Lambda {

	get struct() {
		return struct.optional({
			clientCode: struct.union(['string?', 'array?'])
		});
	}

	async process() {

		await Promise.all([
			this.setClients(),
			this.setModels()
		]);

		await this.createCoreIndexes();
		await this.createClientIndexes();
	}

	async setClients() {

		this.clients = await Client.get(this.data?.clientCode);

		logger.info(`Clients found ${(this.clients?.length) || 0}`);
	}

	async setModels() {
		this.models = await ModelHelper.getModels();
	}

	async createCoreIndexes() {

		if(!this.models?.coreModels?.length)
			return;

		const chunks = arrayChunk(this.models.coreModels, 5);

		for(const models of chunks) {
			await Promise.all(
				models.map(ModelClass => {
					const model = new ModelClass();
					const indexHelper = new IndexHelper(model);
					return indexHelper.process();
				})
			);
		}
	}

	async createClientIndexes() {

		if(!this.models?.clientModels?.length || !this.clients?.length)
			return;

		const chunks = arrayChunk(this.models.clientModels, 5);

		for(const client of this.clients) {

			const session = new ApiSession({ clientCode: client.code });

			for(const models of chunks) {
				await Promise.all(
					models.map(ModelClass => {

						const model = session.getSessionInstance(ModelClass);

						const indexHelper = new IndexHelper(model, client.code);
						return indexHelper.process();
					})
				);
			}
		}
	}
};
