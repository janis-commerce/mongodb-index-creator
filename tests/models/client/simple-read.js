'use strict';

const SimpleModel = require('./simple');

module.exports = class SimpleReadModel extends SimpleModel {

	hasReadDB() {
		return true;
	}
};
