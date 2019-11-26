'use strict';

const assert = require('assert');

const sandbox = require('sinon').createSandbox();

const MongodbIndexCreator = require('./../index');

const MongodbIndexCreatorError = require('./../lib/mongodb-index-creator-error');

describe('MongodbIndexCreator', () => {

	const fakeSettings = {

		database: {
			core: {
				type: 'mongodb',
				protocol: 'mongodb://',
				host: 'localhost',
				database: 'core'
			}
		},
		databaseWriteType: 'mongodb',
		databaseReadType: 'mongodb',
		clients: {
			databaseKey: 'core',
			table: 'clients',
			identifierField: 'code',
			database: {
				fields: {
					write: {
						dbHost: 'host',
						dbPort: 'port',
						dbUser: 'user',
						dbPassword: 'password',
						dbProtocol: 'protocol',
						dbDatabase: 'database'
					},
					read: {
						dbHost: 'host',
						dbPort: 'port',
						dbUser: 'user',
						dbPassword: 'password',
						dbProtocol: 'protocol',
						dbDatabase: 'database'
					}
				}
			}
		}
	};

	const fakeCoreSchemas = {

		core: {
			'my-collection': [
				{
					name: 'my-indexes',
					key: {
						myIndex: 1
					},
					unique: true
				}
			]
		}
	};

	const fakeClientSchemas = {

		'my-collection': [
			{
				key: { myIndex: 1 },
				unique: true
			}
		]
	};

	describe('createCoreIndexes()', {

	});

});
