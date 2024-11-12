'use strict';

const Model = require('@janiscommerce/model');

module.exports = class SimpleCoreModel extends Model {

	get databaseKey() {
		return 'core';
	}

	static get table() {
		return 'simple';
	}

	static get indexes() {
		return [{
			name: 'field',
			key: { field: 1 }
		}];
	}

	isCore() {
		return true;
	}
};
