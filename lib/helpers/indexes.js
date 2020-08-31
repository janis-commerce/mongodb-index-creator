'use strict';

const Results = require('./results');

const indexValidator = require('./index-validator');
const indexDifference = require('./index-difference');

const DEFAULT_ID_INDEX_NAME = '_id_';

const logger = require('../colorful-lllog')();

module.exports = class Indexes {

	static async process(model) {

		indexValidator(model);

		model.indexes = model.constructor.indexes || [];

		const currentIndexes = await Indexes.get(model);

		return Promise.all([
			this.drop(model, currentIndexes),
			this.create(model, currentIndexes)
		]);
	}

	static async get(model) {

		try {

			const indexes = await model.getIndexes();
			return indexes.filter(({ name }) => name !== DEFAULT_ID_INDEX_NAME);

		} catch(err) {
			// Should return an empty array when the target DB or collection not exists
			return [];
		}
	}

	static async drop(model, currentIndexes) {

		const indexesToDrop = indexDifference(currentIndexes, model.indexes);

		if(!indexesToDrop.length)
			return;

		const indexesNames = this.getIndexesNames(indexesToDrop);

		let result;

		try {
			result = await model.dropIndexes(indexesNames);
			result = result ? 'dropped' : 'dropFailed';
		} catch(err) {
			logger.error(`Error dropping indexes for collection ${model.constructor.table}: ${err.message}`);
			result = 'collectionFailed';
		}

		Results.save(
			model.title,
			result,
			indexesNames
		);
	}

	static async create(model, currentIndexes) {

		const indexesToCreate = indexDifference(model.indexes, currentIndexes);

		if(!indexesToCreate.length)
			return;

		let result;

		try {
			result = await model.createIndexes(indexesToCreate);
			result = result ? 'created' : 'createFailed';
		} catch(err) {
			logger.error(`Error creating indexes for collection ${model.constructor.table}: ${err.message}`);
			result = 'collectionFailed';
		}

		Results.save(
			model.title,
			result,
			this.getIndexesNames(indexesToCreate)
		);
	}

	static getIndexesNames(indexes) {
		return indexes.map(({ name }) => name);
	}

};
