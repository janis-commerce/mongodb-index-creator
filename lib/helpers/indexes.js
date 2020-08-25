'use strict';

const Results = require('./results');

const DEFAULT_ID_INDEX_NAME = '_id_';

module.exports = class Indexes {

	static async update(model, indexes, name, useReadDB) {

		model.useReadDB = !!useReadDB;

		console.log(model.useReadDB, name);

		const currentIndexes = await Indexes.get(model);

		return Promise.all([
			this.drop(model, currentIndexes, indexes, name),
			this.create(model, currentIndexes, indexes, name)
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

	static async drop(model, currentIndexes, indexes, name) {

		const indexesToDrop = this.difference(currentIndexes, indexes);

		console.log("to drop", name, indexesToDrop);

		if(!indexesToDrop.length)
			return;

		const result = await model.dropIndexes(indexesToDrop.map(({ name }) => name));

		Results.save(
			name,
			result ? 'dropped' : 'dropFailed',
			indexesToDrop.length
		);
	}

	static async create(model, currentIndexes, indexes, name) {

		const indexesToCreate = this.difference(indexes, currentIndexes);

		console.log("to create", name, indexesToCreate);

		if(!indexesToCreate.length)
			return;

		const result = await model.createIndexes(indexesToCreate);

		Results.save(
			name,
			result ? 'created' : 'createFailed',
			indexesToCreate.length
		);
	}

	static difference(indexesA, indexesB) {
		return indexesA.filter(indexA => !indexesB.some(({ name }) => indexA.name === name));
	}

};
