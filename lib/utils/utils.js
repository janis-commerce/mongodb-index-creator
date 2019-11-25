'use strict';

const assert = require('assert');

/**
 * Validates if the received item is an object and not an array
 * @param {Object} object the object
 * @returns {Boolean} true if is valid, false otherwise
 */
function isObject(object) {
	return object !== null && typeof object === 'object' && !Array.isArray(object);
}

/**
 * Validates if the received objects are exactly equal
 * @param {Object} objectA first object to compare
 * @param {Object} objectB second object to compare
 * @returns {Boolean} true if both objects are equal, false otherwise
 */
function areEqualObjects(objectA, objectB) {

	try {

		assert.deepStrictEqual(objectA, objectB);
		return true;

	} catch(err) {
		return false;
	}
}

module.exports = {
	isObject,
	areEqualObjects
};
