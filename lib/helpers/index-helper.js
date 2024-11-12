'use strict';

const assert = require('assert');

const logger = require('lllog')();

const validateIndexes = require('./validate-indexes');

const DEFAULT_ID_INDEX_NAME = '_id_';

module.exports = class IndexHelper {

	constructor(model, clientCode) {

		validateIndexes(model);

		this.model = model;
		this.modelIndexes = model.constructor.indexes || [];

		this.modelTitle = [];

		if(clientCode)
			this.modelTitle.push(clientCode);

		this.modelTitle.push(model.constructor.table);

		this.modelTitle = this.modelTitle.join('.');
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

		try {

			const result = await this.model.dropIndex(name);

			if(result)
				logger.info(`Index ${this.modelTitle}.${name} - drop success`);
			else
				logger.error(`Index ${this.modelTitle}.${name} - drop error`);

		} catch(err) {
			logger.error(`Index ${this.modelTitle}.${name} - drop error - ${err.message}`);
		}
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

		try {

			const result = await this.model.createIndex(index);

			if(result)
				logger.info(`Index ${this.modelTitle}.${index.name} - create success`);
			else
				logger.error(`Index ${this.modelTitle}.${index.name} - create error`);

		} catch(err) {
			logger.error(`Index ${this.modelTitle}.${index.name} - create error - ${err.message}`);
		}
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
