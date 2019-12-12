#!/usr/bin/env node

'use strict';

const logger = require('./lib/utils/colorful-lllog')();

const MongodbIndexCreator = require('./lib/mongodb-index-creator');

(async () => {

	const mongodbIndexCreator = new MongodbIndexCreator();

	try {

		await mongodbIndexCreator.executeForCoreDatabases();

		await mongodbIndexCreator.executeForClientDatabases();

		logger.info('Operation completed successfully.');

		process.exit(0);

	} catch(err) {

		logger.error(err.message);

		process.exit(1);
	}
})();
