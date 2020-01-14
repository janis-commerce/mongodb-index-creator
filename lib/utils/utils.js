'use strict';

const Model = require('@janiscommerce/model');

/**
 * Validates if the received item is an object and not an array
 * @param {Object} object the object
 * @returns {Boolean} true if is valid, false otherwise
 */
function isObject(object) {
	return object !== null && typeof object === 'object' && !Array.isArray(object);
}

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

module.exports = {
	isObject,
	ModelGenerator
};
