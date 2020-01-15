'use strict';

const Model = require('./model');

const DEFAULT_ID_INDEX_NAME = '_id_';

class IndexesHelper {

	static prepareCoreIndexes(coreSchemas) {
		return this._generateModels(Object.entries(coreSchemas), Model.getInstanceByDatabaseKey);
	}

	static prepareClientIndexes(clients, clientSchemas) {
		return this._generateModels(clients.map(client => [client, clientSchemas]), Model.getSessionInstance);
	}

	static async get(modelInstance) {

		const indexes = await modelInstance.getIndexes();

		return indexes.filter(({ name }) => name !== DEFAULT_ID_INDEX_NAME);
	}

	static getIndexesDifference(indexesA, indexesB) {
		return indexesA.filter(indexA => !indexesB.some(({ name }) => indexA.name === name));
	}

	static _generateModels(formattedIndexes, handler) {

		return formattedIndexes.reduce((prev, [key, collections]) => {

			return [
				...prev,
				...Object.entries(collections).map(([collection, indexes]) => (
					{
						modelInstance: handler(key, collection),
						indexes
					})
				)
			];

		}, []);
	}
}

module.exports = IndexesHelper;
