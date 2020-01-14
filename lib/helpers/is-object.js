'use strict';

/**
 * Validates if the received item is an object and not an array
 * @param {Object} object the object
 * @returns {Boolean} true if is valid, false otherwise
 */
function isObject(object) {
	return object !== null && typeof object === 'object' && !Array.isArray(object);
}

module.exports = isObject;
