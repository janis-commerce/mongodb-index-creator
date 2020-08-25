'use strict';

/**
 * Determinates the difference between two array of indexes
 * @param {array} indexesA Reference Array
 * @param {array} indexesB Array to compeare with
 * @returns {array} The difference between indexesA and indexesB
 */
module.exports = (indexesA, indexesB) => {
	return indexesA.filter(indexA => !indexesB.some(({ name }) => indexA.name === name));
};
