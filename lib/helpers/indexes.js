'use strict';

const Results = require('./results');

const indexValidator = require('./index-validator');
const indexDifference = require('./index-difference');

const DEFAULT_ID_INDEX_NAME = '_id_';

module.exports = class Indexes {

	static async process(model) {

		indexValidator(model);

		model.title = `${model.databaseKey}.${model.constructor.table}`;
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

		const result = await model.dropIndexes(indexesNames);

		Results.save(
			model.title,
			result ? 'dropped' : 'dropFailed',
			indexesNames
		);
	}

	static async create(model, currentIndexes) {

		const indexesToCreate = indexDifference(model.indexes, currentIndexes);

		if(!indexesToCreate.length)
			return;

		const result = await model.createIndexes(indexesToCreate);

		Results.save(
			model.title,
			result ? 'created' : 'createFailed',
			this.getIndexesNames(indexesToCreate)
		);
	}

	static getIndexesNames(indexes) {
		return indexes.map(({ name }) => name);
	}

};
