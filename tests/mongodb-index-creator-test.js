'use strict';

const path = require('path');
const assert = require('assert');
const sandbox = require('sinon').createSandbox();

const { MongoClient } = require('mongodb');

const DatabaseDispatcher = require('@janiscommerce/database-dispatcher');

const ModelClient = require('../lib/model-client');

const MongodbIndexCreator = require('../lib/mongodb-index-creator');
const MongodbIndexCreatorError = require('../lib/mongodb-index-creator-error');

require('../lib/utils/colorful-lllog')('none');

describe('MongodbIndexCreator', () => {

	const fakeDbConfig = {
		type: 'mongodb',
		protocol: 'mongodb://',
		host: 'core-host',
		database: 'core',
		port: 27017
	};

	afterEach(() => {
		sandbox.restore();
	});

	describe('constructor', () => {

		it('Should use the default schemas path when no receives parameters', async () => {

			const mongodbIndexCreator = new MongodbIndexCreator();
			assert.deepEqual(mongodbIndexCreator.schemasPath, path.join(process.cwd(), 'schemas', 'mongo'));
		});

		it('Should use the specified schemas path when receives parameters', async () => {

			const mongodbIndexCreator = new MongodbIndexCreator('some-path');
			assert.deepEqual(mongodbIndexCreator.schemasPath, 'some-path');
		});
	});

	describe('Getters', () => {

		let requireStub;

		beforeEach(() => {
			requireStub = sandbox.stub(module.constructor, '_load');
		});

		const mongodbIndexCreator = new MongodbIndexCreator();

		it('Should return the core schemas from schemas path', async () => {

			requireStub.returns({ core: {} });

			assert.deepStrictEqual(mongodbIndexCreator.coreSchemas, { core: {} });

			sandbox.assert.calledOnce(requireStub);
			sandbox.assert.calledWithMatch(requireStub, path.join(process.cwd(), 'schemas', 'mongo', 'core'));
		});

		it('Should return undefined when the core schemas file require fails', async () => {

			requireStub.throws();

			assert.deepStrictEqual(mongodbIndexCreator.coreSchemas, undefined);

			sandbox.assert.calledOnce(requireStub);
			sandbox.assert.calledWithMatch(requireStub, path.join(process.cwd(), 'schemas', 'mongo', 'core'));
		});

		it('Should return the clients schemas from schemas path', async () => {

			requireStub.returns({ myCollection: [] });

			assert.deepStrictEqual(mongodbIndexCreator.clientSchemas, { myCollection: [] });

			sandbox.assert.calledOnce(requireStub);
			sandbox.assert.calledWithMatch(requireStub, path.join(process.cwd(), 'schemas', 'mongo', 'clients'));
		});

		it('Should return undefined when the client schemas file require fails', async () => {

			requireStub.throws();

			assert.deepStrictEqual(mongodbIndexCreator.clientSchemas, undefined);

			sandbox.assert.calledOnce(requireStub);
			sandbox.assert.calledWithMatch(requireStub, path.join(process.cwd(), 'schemas', 'mongo', 'clients'));
		});
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
					database: 'some-core-db'
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
			sandbox.assert.calledWithExactly(mongoDbStub.getCall(1), 'some-core-db');

			sandbox.assert.calledTwice(collectionStub);
			sandbox.assert.calledWithExactly(collectionStub.getCall(0), 'myCollection');
			sandbox.assert.calledWithExactly(collectionStub.getCall(1), 'someCollection');

			sandbox.assert.calledTwice(createIndexStub);
			sandbox.assert.calledWithExactly(createIndexStub.getCall(0), { myIndex: 1 }, { name: 'myIndex', unique: true });
			sandbox.assert.calledWithExactly(createIndexStub.getCall(1), { someIndex: 1 }, {});
		});

		it('Should throw when can\'t connect to target MongoDB database', async () => {

			setDatabaseConfig({
				core: fakeDbConfig,
				someDatabaseKey: {
					...fakeDbConfig,
					host: 'fake-core-host',
					database: 'fake-core-db'
				}
			});

			sandbox.stub(MongoClient, 'connect')
				.throws();

			await assert.rejects(mongodbIndexCreator.createCoreIndexes(fakeCoreSchemas), {
				name: 'MongodbIndexCreatorError',
				code: MongodbIndexCreatorError.codes.MONGODB_CONNECTION_FAILED
			});

			sandbox.assert.calledOnce(MongoClient.connect);
		});

		it('Should throw when the databaseKey config database type is not MongoDB', async () => {

			setDatabaseConfig({
				core: {
					...fakeDbConfig,
					type: 'mysql'
				}
			});

			sandbox.stub(DatabaseDispatcher, '_getDBDriver')
				.returns(new class MySQL {}());

			await assert.rejects(mongodbIndexCreator.createCoreIndexes(fakeCoreSchemas), {
				name: 'MongodbIndexCreatorError',
				code: MongodbIndexCreatorError.codes.INVALID_DATABASE_TYPE
			});
		});

		describe('Schemas file errors', () => {

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

		let createIndexStub;
		let collectionStub;
		let mongoDbStub;

		beforeEach(() => {
			createIndexStub = sandbox.stub()
				.returns();

			collectionStub = sandbox.stub()
				.returns({ createIndex: createIndexStub });

			mongoDbStub = sandbox.stub()
				.returns({ collection: collectionStub });

			sandbox.stub(MongoClient, 'connect')
				.returns({ db: mongoDbStub });

			sandbox.stub(ModelClient.prototype, 'get');
		});

		const mongodbIndexCreator = new MongodbIndexCreator();

		it('Should create the mongodb indexes for client with write only database', async () => {

			setClientConfig({
				write: {
					dbHost: 'host',
					dbDatabase: 'database'
				}
			});

			setDatabaseWriteType('mongodb');

			ModelClient.prototype.get
				.returns([{
					code: 'some-client',
					dbHost: 'some-host',
					dbDatabase: 'some-db'
				}]);

			await mongodbIndexCreator.createClientIndexes(fakeClientSchemas);

			sandbox.assert.calledOnce(ModelClient.prototype.get);
			sandbox.assert.calledWithExactly(ModelClient.prototype.get);

			sandbox.assert.calledOnce(MongoClient.connect);

			sandbox.assert.calledOnce(mongoDbStub);
			sandbox.assert.calledWithExactly(mongoDbStub.getCall(0), 'some-db');

			sandbox.assert.calledTwice(collectionStub);
			sandbox.assert.calledWithExactly(collectionStub.getCall(0), 'myCollection');
			sandbox.assert.calledWithExactly(collectionStub.getCall(1), 'someCollection');

			sandbox.assert.calledTwice(createIndexStub);
			sandbox.assert.calledWithExactly(createIndexStub.getCall(0), { myIndex: 1 }, { name: 'myIndex', unique: true });
			sandbox.assert.calledWithExactly(createIndexStub.getCall(1), { someIndex: 1 }, {});
		});

		it('Should create the mongodb indexes for client with different read and write databases', async () => {

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

			ModelClient.prototype.get
				.returns([{
					code: 'other-client',
					dbHost: 'other-host',
					dbDatabase: 'other-db',
					dbReadHost: 'read-host',
					dbReadDatabase: 'read-db'
				}]);

			await mongodbIndexCreator.createClientIndexes(fakeClientSchemas);

			sandbox.assert.calledOnce(ModelClient.prototype.get);
			sandbox.assert.calledWithExactly(ModelClient.prototype.get);

			sandbox.assert.calledTwice(MongoClient.connect);

			sandbox.assert.calledTwice(mongoDbStub);
			sandbox.assert.calledWithExactly(mongoDbStub.getCall(0), 'other-db');
			sandbox.assert.calledWithExactly(mongoDbStub.getCall(1), 'read-db');

			sandbox.assert.callCount(collectionStub, 4);
			sandbox.assert.calledWithExactly(collectionStub.getCall(0), 'myCollection');
			sandbox.assert.calledWithExactly(collectionStub.getCall(1), 'someCollection');
			sandbox.assert.calledWithExactly(collectionStub.getCall(2), 'myCollection');
			sandbox.assert.calledWithExactly(collectionStub.getCall(3), 'someCollection');

			sandbox.assert.callCount(createIndexStub, 4);
			sandbox.assert.calledWithExactly(createIndexStub.getCall(0), { myIndex: 1 }, { name: 'myIndex', unique: true });
			sandbox.assert.calledWithExactly(createIndexStub.getCall(1), { someIndex: 1 }, {});
			sandbox.assert.calledWithExactly(createIndexStub.getCall(2), { myIndex: 1 }, { name: 'myIndex', unique: true });
			sandbox.assert.calledWithExactly(createIndexStub.getCall(3), { someIndex: 1 }, {});
		});

		it('Should create the mongodb indexes only for the write database when receives a client with equal read and write databases', async () => {

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

			ModelClient.prototype.get
				.returns([{
					code: 'some-other-client',
					dbHost: 'some-other-host',
					dbDatabase: 'some-other-db',
					dbReadHost: 'some-other-host',
					dbReadDatabase: 'some-other-db'
				}]);

			await mongodbIndexCreator.createClientIndexes(fakeClientSchemas);

			sandbox.assert.calledOnce(ModelClient.prototype.get);
			sandbox.assert.calledWithExactly(ModelClient.prototype.get);

			sandbox.assert.calledOnce(MongoClient.connect);

			sandbox.assert.calledOnce(mongoDbStub);
			sandbox.assert.calledWithExactly(mongoDbStub.getCall(0), 'some-other-db');

			sandbox.assert.calledTwice(collectionStub);
			sandbox.assert.calledWithExactly(collectionStub.getCall(0), 'myCollection');
			sandbox.assert.calledWithExactly(collectionStub.getCall(1), 'someCollection');

			sandbox.assert.calledTwice(createIndexStub);
			sandbox.assert.calledWithExactly(createIndexStub.getCall(0), { myIndex: 1 }, { name: 'myIndex', unique: true });
			sandbox.assert.calledWithExactly(createIndexStub.getCall(1), { someIndex: 1 }, {});
		});

		it('Shouldn\'t do anything when there are not clients from client-model', async () => {

			ModelClient.prototype.get
				.returns([]);

			await mongodbIndexCreator.createClientIndexes(fakeClientSchemas);

			sandbox.assert.calledOnce(ModelClient.prototype.get);
			sandbox.assert.calledWithExactly(ModelClient.prototype.get);

			sandbox.assert.notCalled(MongoClient.connect);
			sandbox.assert.notCalled(mongoDbStub);
			sandbox.assert.notCalled(collectionStub);
			sandbox.assert.notCalled(createIndexStub);
		});

		it('Should throw when can\'t get the clients from client-model', async () => {

			ModelClient.prototype.get
				.throws();

			await assert.rejects(mongodbIndexCreator.createClientIndexes(fakeClientSchemas), {
				name: 'MongodbIndexCreatorError',
				code: MongodbIndexCreatorError.codes.MODEL_CLIENT_ERROR
			});

			sandbox.assert.calledOnce(ModelClient.prototype.get);
			sandbox.assert.calledWithExactly(ModelClient.prototype.get);
		});

		it('Should throw when can\'t connect to target MongoDB database', async () => {

			setClientConfig({
				write: {
					dbHost: 'host',
					dbDatabase: 'database'
				}
			});

			setDatabaseWriteType('mongodb');

			ModelClient.prototype.get
				.returns([{
					code: 'fake-client',
					dbHost: 'fake-host',
					dbDatabase: 'fake-client-db'
				}]);

			MongoClient.connect
				.throws();

			await assert.rejects(mongodbIndexCreator.createClientIndexes(fakeClientSchemas), {
				name: 'MongodbIndexCreatorError',
				code: MongodbIndexCreatorError.codes.MONGODB_CONNECTION_FAILED
			});

			sandbox.assert.calledOnce(MongoClient.connect);
		});

		it('Should throw when the client database type is not MongoDB', async () => {

			setClientConfig({
				write: {
					dbHost: 'host',
					dbDatabase: 'database'
				}
			});

			setDatabaseWriteType('mysql');

			sandbox.stub(DatabaseDispatcher, '_getDBDriver')
				.returns(new class MySQL {}());

			ModelClient.prototype.get
				.returns([{
					code: 'fake-client',
					dbHost: 'fake-host',
					dbDatabase: 'fake-db'
				}]);

			await assert.rejects(mongodbIndexCreator.createClientIndexes(fakeClientSchemas), {
				name: 'MongodbIndexCreatorError',
				code: MongodbIndexCreatorError.codes.INVALID_DATABASE_TYPE
			});
		});

		describe('Schemas file errors', () => {

			[null, undefined, 1, 'string', ['array']].forEach(values => {

				it('Should throw when the received client schemas is not an object (not an array) or not exists', async () => {

					await assert.rejects(mongodbIndexCreator.createClientIndexes(values), {
						name: 'MongodbIndexCreatorError',
						code: MongodbIndexCreatorError.codes.INVALID_CLIENT_SCHEMAS
					});
				});
			});

			[null, undefined, 'string', 1, { some: 'object' }].forEach(indexes => {

				it('Should throw when the indexes from the received client schemas is not an array or not exists', async () => {

					await assert.rejects(mongodbIndexCreator.createClientIndexes({ myCollection: indexes }), {
						name: 'MongodbIndexCreatorError',
						code: MongodbIndexCreatorError.codes.INVALID_COLLECTION_INDEXES
					});
				});

				it('Should throw when the indexes from the received client schemas are invalid', async () => {

					await assert.rejects(mongodbIndexCreator.createClientIndexes({ myCollection: [indexes] }), {
						name: 'MongodbIndexCreatorError',
						code: MongodbIndexCreatorError.codes.INVALID_COLLECTION_INDEXES
					});
				});
			});
		});
	});

	describe('execute()', () => {

		let coreSchemasStub;
		let clientSchemasStub;

		beforeEach(() => {

			coreSchemasStub = sandbox.stub(MongodbIndexCreator.prototype, 'coreSchemas');
			clientSchemasStub = sandbox.stub(MongodbIndexCreator.prototype, 'clientSchemas');

			sandbox.stub(MongodbIndexCreator.prototype, 'createCoreIndexes');
			sandbox.stub(MongodbIndexCreator.prototype, 'createClientIndexes');
		});

		const mongodbIndexCreator = new MongodbIndexCreator();

		it('Should create the core indexes when the core schemas file exists', async () => {

			coreSchemasStub.get(() => ({ core: {} }));
			clientSchemasStub.get(() => undefined);
			mongodbIndexCreator.createCoreIndexes.returns();

			await mongodbIndexCreator.execute();

			sandbox.assert.calledOnce(mongodbIndexCreator.createCoreIndexes);
			sandbox.assert.calledWithExactly(mongodbIndexCreator.createCoreIndexes, { core: {} });
		});

		it('Should throw when the createCoreIndexes process fails', async () => {

			coreSchemasStub.get(() => ({ core: {} }));
			clientSchemasStub.get(() => undefined);
			mongodbIndexCreator.createCoreIndexes.throws();

			await assert.rejects(mongodbIndexCreator.execute(), {
				name: 'MongodbIndexCreatorError',
				code: MongodbIndexCreatorError.codes.CORE_INDEXES_CREATE_FAILED
			});

			sandbox.assert.calledOnce(mongodbIndexCreator.createCoreIndexes);
			sandbox.assert.calledWithExactly(mongodbIndexCreator.createCoreIndexes, { core: {} });
		});

		it('Should create the client indexes when the client schemas file exists', async () => {

			coreSchemasStub.get(() => undefined);
			clientSchemasStub.get(() => ({ myCollection: [] }));
			mongodbIndexCreator.createClientIndexes.returns();

			await mongodbIndexCreator.execute();

			sandbox.assert.calledOnce(mongodbIndexCreator.createClientIndexes);
			sandbox.assert.calledWithExactly(mongodbIndexCreator.createClientIndexes, { myCollection: [] });
		});

		it('Should throw when the createClientIndexes process fails', async () => {

			coreSchemasStub.get(() => undefined);
			clientSchemasStub.get(() => ({ myCollection: [] }));
			mongodbIndexCreator.createClientIndexes.throws();

			await assert.rejects(mongodbIndexCreator.execute(), {
				name: 'MongodbIndexCreatorError',
				code: MongodbIndexCreatorError.codes.CLIENT_INDEXES_CREATE_FAILED
			});

			sandbox.assert.calledOnce(mongodbIndexCreator.createClientIndexes);
			sandbox.assert.calledWithExactly(mongodbIndexCreator.createClientIndexes, { myCollection: [] });
		});

		it('Should skip the operation when the core and client schemas file not exist', async () => {

			coreSchemasStub.get(() => undefined);
			clientSchemasStub.get(() => undefined);

			await mongodbIndexCreator.execute();

			sandbox.assert.notCalled(mongodbIndexCreator.createCoreIndexes);
			sandbox.assert.notCalled(mongodbIndexCreator.createClientIndexes);
		});
	});
});
