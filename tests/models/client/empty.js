'use strict';

const Model = require('@janiscommerce/model');

module.exports = class EmptyModel extends Model {

	get databaseKey() {
		return 'default';
	}

	static get table() {
		return 'empty';
	}

	isCore() {
		return false;
	}
};
