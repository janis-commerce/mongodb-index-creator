'use strict';

module.exports = class NotModel {

	get databaseKey() {
		return 'core';
	}

	static get table() {
		return 'empty';
	}

	isCore() {
		return true;
	}
};
