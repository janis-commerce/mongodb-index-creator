'use strict';

const Model = require('@janiscommerce/model');
const Settings = require('@janiscommerce/settings');

class ModelClient extends Model {

	static get settings() {
		return Settings.get('clients') || {};
	}

	get databaseKey() {
		return this.constructor.settings.databaseKey || 'core';
	}

	static get table() {
		return this.settings.table || 'clients';
	}

	static get identifierField() {
		return this.settings.identifierField || 'code';
	}

	static get fields() {
		return {
			[this.identifierField]: true
		};
	}
}

module.exports = ModelClient;
