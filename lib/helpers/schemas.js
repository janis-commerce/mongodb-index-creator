'use strict';

const path = require('path');

const DEFAULT_SCHEMAS_PATH = path.join(process.cwd(), 'schemas', 'mongo');

class SchemasHelper {

	constructor(schemasPath) {
		this.schemasPath = schemasPath || DEFAULT_SCHEMAS_PATH;
	}

	get core() {

		try {

			return require(path.join(this.schemasPath, 'core')); // eslint-disable-line global-require, import/no-dynamic-require

		} catch(err) {
			return undefined;
		}
	}

	get client() {

		try {

			return require(path.join(this.schemasPath, 'clients')); // eslint-disable-line global-require, import/no-dynamic-require

		} catch(err) {
			return undefined;
		}
	}
}

module.exports = SchemasHelper;
