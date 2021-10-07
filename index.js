#!/usr/bin/env node

'use strict';

const logger = require('./lib/colorful-lllog')();

const MongodbIndexCreator = require('./lib/mongodb-index-creator');
const MongodbIndexCreatorError = require('./lib/mongodb-index-creator-error');

(async () => {

	const mongodbIndexCreator = new MongodbIndexCreator();

	try {

		await mongodbIndexCreator.execute();

		logger.info('Operation completed successfully.');

		process.exit(0);

	} catch(err) {
		throw new MongodbIndexCreatorError(err.message, err.code);
	}
})();
