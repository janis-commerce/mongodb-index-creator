'use strict';

const assert = require('assert');
const Results = require('./results');

const validateIndexes = require('./validate-indexes');

const logger = require('../colorful-lllog')();

const DEFAULT_ID_INDEX_NAME = '_id_';

module.exports = class IndexHelper {

	constructor(model) {

		validateIndexes(model);

		this.model = model;
		this.modelIndexes = model.constructor.indexes || [];

		this.modelTitle = model.clientCode ? `${model.clientCode}.` : '';
		this.modelTitle = `${this.modelTitle}${model.databaseKey}.${model.constructor.table}`;
	}

	async process() {
		await this.setCurrentIndexes();
		await this.dropIndexes();
		await this.createIndexes();
	}

	async setCurrentIndexes() {

		try {
			const indexes = await this.model.getIndexes();
			this.currentIndexes = indexes.filter(({ name }) => name !== DEFAULT_ID_INDEX_NAME);
		} catch(err) {
			// Is an empty array when the target DB or collection not exists
			this.currentIndexes = [];
		}
	}

	async dropIndexes() {

		const indexesToDrop = this.findIndexesToDrop();

		await Promise.all(indexesToDrop.map(index => this.drop(index)));
	}

	findIndexesToDrop() {

		if(!this.currentIndexes.length)
			return []; // no hay ninguno en mongo, nada para borrar

		if(!this.modelIndexes.length)
			return this.currentIndexes; // no hay ninguno definido en el model, se borra todos lo de mongo

		return this.currentIndexes.reduce((indexesToDrop, currentIndex) => {

			const modelIndex = this.findIndex(currentIndex, this.modelIndexes);

			if(!modelIndex || !this.areEqualIndex(modelIndex, currentIndex))
				indexesToDrop.push(currentIndex);

			return indexesToDrop;
		}, []);
	}

	async drop({ name }) {

		let result;

		try {
			result = await this.model.dropIndex(name);
			result = result ? 'dropped' : 'dropFailed';
		} catch(err) {

			result = 'dropError';

			logger.error(`Error dropping index '${name}' for collection ${this.modelTitle}: ${err.message}`);
		}

		Results.save(this.model, result, name);
	}

	async createIndexes() {

		const indexesToCreate = this.findIndexesToCreate();

		await Promise.all(indexesToCreate.map(index => this.create(index)));
	}

	findIndexesToCreate() {

		if(!this.modelIndexes.length)
			return []; // nada para crear en el modelo

		if(!this.currentIndexes.length)
			return this.modelIndexes; // no hay ninguno en mongo, crea todos los del modelo (los que haya)

		return this.modelIndexes.reduce((indexesToCreate, modelIndex) => {

			const currentIndex = this.findIndex(modelIndex, this.currentIndexes);

			if(!currentIndex || !this.areEqualIndex(modelIndex, currentIndex))
				indexesToCreate.push(modelIndex);

			// si se da que currentIndex && modelIndex !== currentIndex es porque antes lo tiene que haber encontrado para eliminar

			return indexesToCreate;
		}, []);
	}

	async create(index) {

		let result;

		try {
			result = await this.model.createIndex(index);
			result = result ? 'created' : 'createFailed';
		} catch(err) {

			result = 'createError';

			logger.error(`Error creating index '${index.name}' for collection ${this.modelTitle}: ${err.message}`);
		}

		Results.save(this.model, result, index.name);
	}

	findIndex({ name: indexName }, indexes) {
		return indexes.find(({ name }) => indexName === name);
	}

	areEqualIndex(indexA, indexB) {
		try {
			assert.deepStrictEqual(this.formatIndex(indexA), this.formatIndex(indexB));
			return true;
		} catch(err) {
			return false;
		}
	}

	formatIndex({
		key,
		unique,
		sparse,
		expireAfterSeconds,
		partialFilterExpression
	}) {
		return {
			key,
			unique: !!unique,
			sparse: !!sparse,
			...expireAfterSeconds && { expireAfterSeconds },
			...partialFilterExpression && { partialFilterExpression }
		};
	}

};
