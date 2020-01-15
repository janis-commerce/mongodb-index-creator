'use strict';

function isObject(object) {
	return object !== null && typeof object === 'object' && !Array.isArray(object);
}

module.exports = isObject;
