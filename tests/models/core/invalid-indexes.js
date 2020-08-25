'use strict';

const Model = require('@janiscommerce/model');

module.exports = indexes => {

	return class InvalidIndexesModel extends Model {

		get databaseKey() {
			return 'core';
		}

		static get table() {
			return 'invalid-indexes';
		}

		static get indexes() {
			return indexes;
		}

	};

};
