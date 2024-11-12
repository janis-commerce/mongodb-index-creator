'use strict';

const Model = require('@janiscommerce/model');

module.exports = class EmptyCoreModel extends Model {

	get databaseKey() {
		return 'core';
	}

	static get table() {
		return 'empty';
	}

	isCore() {
		return true;
	}
};
