'use strict';

const Model = require('@janiscommerce/model');

class ModelGenerator {

	static getInstanceByDatabaseKey(databaseKey, table) {

		/* istanbul ignore next */
		class FakeModel extends Model {

			get databaseKey() {
				return databaseKey;
			}

			static get table() {
				return table;
			}
		}

		return new FakeModel();
	}

	static getSessionInstance(client, table) {

		/* istanbul ignore next */
		class FakeModel extends Model {

			static get table() {
				return table;
			}
		}

		const fakeModel = new FakeModel();

		fakeModel.session = { client };

		return fakeModel;
	}
}

module.exports = ModelGenerator;
