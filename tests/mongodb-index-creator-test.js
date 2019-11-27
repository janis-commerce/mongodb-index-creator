'use strict';

const assert = require('assert');
const sandbox = require('sinon').createSandbox();

const { MongoClient } = require('mongodb');

const DatabaseDispatcher = require('@janiscommerce/database-dispatcher');

const ModelClient = require('../lib/model-client');

const MongodbIndexCreator = require('../lib/mongodb-index-creator');
const MongodbIndexCreatorError = require('../lib/mongodb-index-creator-error');

describe('MongodbIndexCreator', () => {

	const fakeDbConfig = {
		type: 'mongodb',
		protocol: 'mongodb://',
		host: 'localhost',
		database: 'core',
		port: 27017
	};

	afterEach(() => {
		sandbox.restore();
	});

	describe('createCoreIndexes()', () => {

		const fakeCoreSchemas = {
			core: {
				myCollection: [
					{
						name: 'myIndex',
						key: { myIndex: 1 },
						unique: true
					}
				]
			},
			someDatabaseKey: {
				someCollection: [
					{
						key: { someIndex: 1 }
					}
				]
			}
		};

		const setDatabaseConfig = config => {
			sandbox.stub(DatabaseDispatcher, 'config')
				.get(() => config);
		};

		const mongodbIndexCreator = new MongodbIndexCreator();

		it('Should create the mongodb indexes for core databases', async () => {

			setDatabaseConfig({
				core: fakeDbConfig,
				someDatabaseKey: {
					...fakeDbConfig,
					database: 'some-database'
				}
			});

			const createIndexStub = sandbox.stub()
				.returns();

			const collectionStub = sandbox.stub()
				.returns({ createIndex: createIndexStub });

			const mongoDbStub = sandbox.stub()
				.returns({ collection: collectionStub });

			sandbox.stub(MongoClient, 'connect')
				.returns({ db: mongoDbStub });

			await mongodbIndexCreator.createCoreIndexes(fakeCoreSchemas);

			sandbox.assert.calledTwice(MongoClient.connect);

			sandbox.assert.calledTwice(mongoDbStub);
			sandbox.assert.calledWithExactly(mongoDbStub.getCall(0), 'core');
			sandbox.assert.calledWithExactly(mongoDbStub.getCall(1), 'some-database');

			sandbox.assert.calledTwice(collectionStub);
			sandbox.assert.calledWithExactly(collectionStub.getCall(0), 'myCollection');
			sandbox.assert.calledWithExactly(collectionStub.getCall(1), 'someCollection');

			sandbox.assert.calledTwice(createIndexStub);
			sandbox.assert.calledWithExactly(createIndexStub.getCall(0), { myIndex: 1 }, { name: 'myIndex', unique: true });
			sandbox.assert.calledWithExactly(createIndexStub.getCall(1), { someIndex: 1 }, {});
		});

		context('Schemas file errors', () => {

			[null, undefined, 1, 'string', ['array']].forEach(values => {

				it('Should throw when the received core schemas is not an object (not an array) or not exists', async () => {

					await assert.rejects(mongodbIndexCreator.createCoreIndexes(values), {
						name: 'MongodbIndexCreatorError',
						code: MongodbIndexCreatorError.codes.INVALID_CORE_SCHEMAS
					});
				});

				it('Should throw when the databaseKeys from the core schemas is not an object (not an array) or not exists', async () => {

					setDatabaseConfig({ core: fakeDbConfig });

					await assert.rejects(mongodbIndexCreator.createCoreIndexes({ core: values }), {
						name: 'MongodbIndexCreatorError',
						code: MongodbIndexCreatorError.codes.INVALID_COLLECTIONS
					});
				});
			});

			[null, undefined, 'string', 1, { some: 'object' }].forEach(indexes => {

				it('Should throw when the indexes from the received databaseKeys is not an array or not exists', async () => {

					setDatabaseConfig({ core: fakeDbConfig });

					await assert.rejects(mongodbIndexCreator.createCoreIndexes({ core: { myCollection: indexes } }), {
						name: 'MongodbIndexCreatorError',
						code: MongodbIndexCreatorError.codes.INVALID_COLLECTION_INDEXES
					});
				});

				it('Should throw when the indexes from the received databaseKeys are invalid', async () => {

					setDatabaseConfig({ core: fakeDbConfig });

					await assert.rejects(mongodbIndexCreator.createCoreIndexes({ core: { myCollection: [indexes] } }), {
						name: 'MongodbIndexCreatorError',
						code: MongodbIndexCreatorError.codes.INVALID_COLLECTION_INDEXES
					});
				});
			});
		});
	});

	describe('createClientIndexes()', () => {

		const fakeClientSchemas = {
			myCollection: [
				{
					name: 'myIndex',
					key: { myIndex: 1 },
					unique: true
				}
			],
			someCollection: [
				{
					key: { someIndex: 1 }
				}
			]
		};

		const fakeClient = {
			name: 'some-client',
			dbHost: 'localhost',
			dbDatabase: 'some-database'
		};

		const setClientConfig = config => {
			sandbox.stub(DatabaseDispatcher, 'clientConfig')
				.get(() => config);
		};

		const setDatabaseWriteType = type => {
			sandbox.stub(DatabaseDispatcher, 'databaseWriteType')
				.get(() => type);
		};

		const setDatabaseReadType = type => {
			sandbox.stub(DatabaseDispatcher, 'databaseReadType')
				.get(() => type);
		};

		const mongodbIndexCreator = new MongodbIndexCreator();

		it.only('Should create the mongodb indexes for client databases', async () => {

			setClientConfig({
				write: {
					dbHost: 'host',
					dbDatabase: 'database'
				},
				read: {
					dbReadHost: 'host',
					dbReadDatabase: 'database'
				}
			});

			setDatabaseWriteType('mongodb');
			setDatabaseReadType('mongodb');

			const createIndexStub = sandbox.stub()
				.returns();

			const collectionStub = sandbox.stub()
				.returns({ createIndex: createIndexStub });

			const mongoDbStub = sandbox.stub()
				.returns({ collection: collectionStub });

			sandbox.stub(MongoClient, 'connect')
				.returns({ db: mongoDbStub });

			sandbox.stub(ModelClient.prototype, 'get')
				.returns([
					fakeClient,
					{
						...fakeClient,
						dbReadHost: 'read-localhost',
						dbReadDatabase: 'read-database'
					},
					{
						...fakeClient,
						dbReadHost: fakeClient.dbHost,
						dbReadDatabase: fakeClient.dbDatabase
					}
				]);

			await mongodbIndexCreator.createClientIndexes(fakeClientSchemas);

			sandbox.assert.calledOnce(ModelClient.prototype.get);
			sandbox.assert.calledWithExactly(ModelClient.prototype.get);

			sandbox.assert.calledThrice(MongoClient.connect);

			sandbox.assert.calledThrice(mongoDbStub);
			// sandbox.assert.calledWithExactly(mongoDbStub.getCall(0), 'some-database');
			// sandbox.assert.calledWithExactly(mongoDbStub.getCall(1), 'some-database');

			sandbox.assert.calledThrice(collectionStub);
			// sandbox.assert.calledWithExactly(collectionStub.getCall(0), 'myCollection');
			// sandbox.assert.calledWithExactly(collectionStub.getCall(1), 'someCollection');

			sandbox.assert.calledThrice(createIndexStub);
			// sandbox.assert.calledWithExactly(createIndexStub.getCall(0), { myIndex: 1 }, { name: 'myIndex', unique: true });
			// sandbox.assert.calledWithExactly(createIndexStub.getCall(1), { someIndex: 1 }, {});
		});

		context('Schemas file errors', () => {

			[null, undefined, 1, 'string', ['array']].forEach(values => {

				it('Should throw when the received core schemas is not an object (not an array) or not exists', async () => {

					await assert.rejects(mongodbIndexCreator.createCoreIndexes(values), {
						name: 'MongodbIndexCreatorError',
						code: MongodbIndexCreatorError.codes.INVALID_CORE_SCHEMAS
					});
				});

				it('Should throw when the databaseKeys from the core schemas is not an object (not an array) or not exists', async () => {

					setDatabaseConfig({ core: fakeDbConfig });

					await assert.rejects(mongodbIndexCreator.createCoreIndexes({ core: values }), {
						name: 'MongodbIndexCreatorError',
						code: MongodbIndexCreatorError.codes.INVALID_COLLECTIONS
					});
				});
			});

			[null, undefined, 'string', 1, { some: 'object' }].forEach(indexes => {

				it('Should throw when the indexes from the received databaseKeys is not an array or not exists', async () => {

					setDatabaseConfig({ core: fakeDbConfig });

					await assert.rejects(mongodbIndexCreator.createCoreIndexes({ core: { myCollection: indexes } }), {
						name: 'MongodbIndexCreatorError',
						code: MongodbIndexCreatorError.codes.INVALID_COLLECTION_INDEXES
					});
				});

				it('Should throw when the indexes from the received databaseKeys are invalid', async () => {

					setDatabaseConfig({ core: fakeDbConfig });

					await assert.rejects(mongodbIndexCreator.createCoreIndexes({ core: { myCollection: [indexes] } }), {
						name: 'MongodbIndexCreatorError',
						code: MongodbIndexCreatorError.codes.INVALID_COLLECTION_INDEXES
					});
				});
			});
		});
	});
});
