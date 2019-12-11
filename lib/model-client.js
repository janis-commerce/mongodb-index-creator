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

	async getByClientCode(clientCode) {

		const [client] = await this.get({
			limit: 1,
			filters: {
				[this.constructor.identifierField]: clientCode
			}
		});

		return client;
	}
}

module.exports = ModelClient;
