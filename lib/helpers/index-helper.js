'use strict';

const assert = require('assert');

const Results = require('./results');

const validateIndexes = require('./validate-indexes');

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

		// drop y create no pueden hacerse a la vez, porque para modificar un indice se tiene que borrar y volver a crear
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

		return this.currentIndexes.filter(currentIndex => {

			const modelIndex = this.findIndex(currentIndex, this.modelIndexes);

			return !modelIndex || !this.areEqualIndex(modelIndex, currentIndex);
		});
	}

	async drop({ name }) {

		let result = false;
		let errorMessage;

		try {
			result = await this.model.dropIndex(name);
		} catch(err) {
			errorMessage = err.message;
		}

		Results.save('drop', !!result, this.model, name, errorMessage);
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

		return this.modelIndexes.filter(modelIndex => {

			const currentIndex = this.findIndex(modelIndex, this.currentIndexes);

			// si se da que currentIndex && modelIndex !== currentIndex es porque antes lo tiene que haber encontrado para eliminar

			return !currentIndex || !this.areEqualIndex(modelIndex, currentIndex);
		});
	}

	async create(index) {

		let result = false;
		let errorMessage;

		try {
			result = await this.model.createIndex(index);
		} catch(err) {
			errorMessage = err.message;
		}

		Results.save('create', !!result, this.model, index.name, errorMessage);
	}

	findIndex({ name: indexName }, indexes) {
		return indexes.find(({ name }) => indexName === name);
	}

	areEqualIndex(indexA, indexB) {
		try {
			assert.deepStrictEqual(this.formatToCompare(indexA), this.formatToCompare(indexB));
			return true;
		} catch(err) {
			return false;
		}
	}

	formatToCompare({
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
