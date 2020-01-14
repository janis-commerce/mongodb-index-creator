'use strict';

const Model = require('./model');
const isObject = require('./is-object');
const Collections = require('./collections');

const MongodbIndexCreatorError = require('../mongodb-index-creator-error');

const DEFAULT_ID_INDEX_NAME = '_id_';

class IndexesHelper {

	/**
	 * Generate fake models for the received collections using the specified method
	 * @param {Function} modelMethod The Model method that will generate the instance, may be different for core or client models
	 * @param {Any} methodParam The param for the specified method
	 * @param {Object.<array>} collections The collections
	 * @returns {Array.<object>} An array of objects with the Model instance for each collection with the indexes
	 */
	static _generateModels(modelMethod, methodParam, collections) {

		return Object.entries(collections).map(([collection, indexes]) => (
			{
				modelInstance: Model[modelMethod](methodParam, collection),
				indexes
			}
		));
	}

	static getIndexesDifference(indexesA, indexesB) {
		return indexesA.filter(indexA => !indexesB.some(({ name }) => indexA.name === name));
	}

	static async get(modelInstance) {

		const indexes = await modelInstance.getIndexes();

		return indexes.filter(({ name }) => name !== DEFAULT_ID_INDEX_NAME);
	}

	static prepareCoreIndexes(coreSchemas) {

		if(!isObject(coreSchemas)) {
			throw new MongodbIndexCreatorError('Invalid core schemas: Should exist and must be an object.',
				MongodbIndexCreatorError.codes.INVALID_CORE_SCHEMAS);
		}

		return Object.entries(coreSchemas).reduce((prev, [databaseKey, collections]) => {

			Collections.validate(collections);

			return [
				...prev,
				...this._generateModels('getInstanceByDatabaseKey', databaseKey, collections)
			];

		}, []);
	}

	static prepareClientIndexes(clients, clientSchemas) {

		if(!isObject(clientSchemas)) {
			throw new MongodbIndexCreatorError('Invalid client schemas: Should exist and must be an object.',
				MongodbIndexCreatorError.codes.INVALID_CLIENT_SCHEMAS);
		}

		Collections.validate(clientSchemas);

		return clients.reduce((prev, client) => {

			return [
				...prev,
				...this._generateModels('getSessionInstance', client, clientSchemas)
			];

		}, []);
	}
}

module.exports = IndexesHelper;
