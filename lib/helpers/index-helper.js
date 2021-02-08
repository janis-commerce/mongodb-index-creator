'use strict';

const assert = require('assert');
const Results = require('./results');

const validateIndexes = require('./validate-indexes');

const DEFAULT_ID_INDEX_NAME = '_id_';

const logger = require('../colorful-lllog')();

module.exports = class IndexHelper {

	constructor(model) {

		validateIndexes(model);

		this.model = model;
		this.model.indexes = model.constructor.indexes || [];
	}

	get modelTitle() {

		const operation = this.model.useReadDB ? 'read' : 'write';

		let title = `${this.model.databaseKey}.${operation}.${this.model.constructor.table}`;

		if(this.model.clientCode)
			title = `${this.model.clientCode}.${title}`;

		return title;
	}

	async process() {
		await this.setCurrentIndexes();
		await this.drop();
		return this.create();
	}

	async setCurrentIndexes() {

		try {
			const indexes = await this.model.getIndexes();
			this.model.currentIndexes = indexes.filter(({ name }) => name !== DEFAULT_ID_INDEX_NAME);
		} catch(err) {
			// Is an empty array when the target DB or collection not exists
			this.model.currentIndexes = [];
		}
	}

	async drop() {

		const indexesToDrop = this.getIndexesToDrop();

		if(!indexesToDrop.length)
			return;

		const indexesNames = this.getIndexesNames(indexesToDrop);

		let result;

		try {
			result = await this.model.dropIndexes(indexesNames);
			result = result ? 'dropped' : 'dropFailed';
		} catch(err) {
			logger.error(`Error dropping indexes for collection ${this.modelTitle}: ${err.message}`);
			result = 'collectionFailed';
		}

		Results.save(
			this.model,
			result,
			indexesNames
		);
	}

	async create() {

		const indexesToCreate = this.getIndexesToCreate();

		if(!indexesToCreate.length)
			return;

		let result;

		try {
			result = await this.model.createIndexes(indexesToCreate);
			result = result ? 'created' : 'createFailed';
		} catch(err) {
			logger.error(`Error creating indexes for collection ${this.modelTitle}: ${err.message}`);
			result = 'collectionFailed';
		}

		Results.save(
			this.model,
			result,
			this.getIndexesNames(indexesToCreate)
		);
	}

	getIndexesNames(indexes) {
		return indexes.map(({ name }) => name);
	}

	getIndexesToDrop() {

		if(!this.model.currentIndexes.length)
			return []; // no hay ninguno en mongo, nada para borrar

		if(!this.model.indexes.length)
			return this.model.currentIndexes; // no hay ninguno definido en el model, se borra todos lo de mongo

		return this.model.currentIndexes.reduce((indexesToDrop, currentIndex) => {

			const indexInModel = this.findIndex(currentIndex, this.model.indexes);

			if(!indexInModel || !this.areEqualIndex(indexInModel, currentIndex))
				indexesToDrop.push(currentIndex);

			return indexesToDrop;
		}, []);
	}

	getIndexesToCreate() {

		if(!this.model.indexes.length)
			return []; // nada para crear en el modelo

		if(!this.model.currentIndexes.length)
			return this.model.indexes; // no hay ninguno en mongo, crea todos los del modelo (los que haya)

		return this.model.indexes.reduce((indexesToCreate, indexInModel) => {

			const currentIndex = this.findIndex(indexInModel, this.model.currentIndexes);

			if(!currentIndex || !this.areEqualIndex(indexInModel, currentIndex))
				indexesToCreate.push(indexInModel);

			// si se da que currentIndex && indexInModel !== currentIndex es porque antes lo tiene que haber encontrado para eliminar

			return indexesToCreate;
		}, []);
	}

	findIndex(index, indexes) {
		return indexes.find(loopIndex => index.name === loopIndex.name);
	}

	areEqualIndex(indexA, indexB) {
		try {
			assert.deepStrictEqual(this.minifyIndex(indexA), this.minifyIndex(indexB));
			return true;
		} catch(err) {
			return false;
		}
	}

	minifyIndex({
		key,
		unique,
		expireAfterSeconds,
		partialFilterExpression,
		sparse
	}) {
		return {
			key,
			unique,
			expireAfterSeconds,
			partialFilterExpression,
			sparse
		};
	}

};
