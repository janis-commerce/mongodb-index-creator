'use strict';

const Model = require('@janiscommerce/model');

module.exports = class ModelGenerator {

	static getInstance(databaseKey, table, client) {

		/* istanbul ignore next */
		class FakeModel extends Model {

			get databaseKey() {
				return databaseKey;
			}

			static get table() {
				return table;
			}
		}

		const fakeModel = new FakeModel();

		if(client)
			fakeModel.session = { client };

		return fakeModel;
	}
};
