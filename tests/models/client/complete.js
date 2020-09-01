'use strict';

const Model = require('@janiscommerce/model');

module.exports = class CompleteModel extends Model {

	get databaseKey() {
		return 'default';
	}

	static get table() {
		return 'complete';
	}

	static get indexes() {
		return [{
			name: 'field',
			key: { field: 1 }
		}, {
			name: 'foo_bar_unique',
			key: { foo: 1, bar: 1 },
			unique: true
		}];
	}

	hasReadDB() {
		return false;
	}
};
