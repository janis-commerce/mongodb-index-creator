'use strict';

const Model = require('@janiscommerce/model');

module.exports = class ClientModel extends Model {

	get databaseKey() {
		return 'core';
	}

	static get table() {
		return 'clients';
	}

	isCore() {
		return true;
	}
};
