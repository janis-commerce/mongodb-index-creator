'use strict';

const Model = require('./model-generator');

const DEFAULT_ID_INDEX_NAME = '_id_';

class IndexesHelper {

	static prepareCoreIndexes(coreSchemas) {
		return this._generateCoreModels(coreSchemas);
	}

	static prepareClientIndexes(clients, clientSchemas) {
		return this._generateClientModels(clients, clientSchemas);
	}

	static async get(modelInstance) {

		const indexes = await modelInstance.getIndexes();

		return indexes.filter(({ name }) => name !== DEFAULT_ID_INDEX_NAME);
	}

	static difference(indexesA, indexesB) {
		return indexesA.filter(indexA => !indexesB.some(({ name }) => indexA.name === name));
	}

	static _generateCoreModels(schemas) {

		return Object.entries(schemas).reduce((models, [databaseKey, collections]) => {

			models.push(
				...Object.entries(collections).map(([collection, indexes]) => (
					{
						modelInstance: Model.getInstanceByDatabaseKey(databaseKey, collection),
						indexes
					}
				))
			);

			return models;

		}, []);
	}

	static _generateClientModels(clients, collections) {

		return clients.reduce((models, client) => {

			models.push(
				...Object.entries(collections).map(([collection, indexes]) => (
					{
						modelInstance: Model.getSessionInstance(client, collection),
						indexes
					}
				))
			);

			return models;

		}, []);
	}
}

module.exports = IndexesHelper;
