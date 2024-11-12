'use strict';

const Model = require('@janiscommerce/model');

module.exports = class SimpleModel extends Model {

	get databaseKey() {
		return 'default';
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
		return false;
	}
};
