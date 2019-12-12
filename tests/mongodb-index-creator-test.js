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

	const setCoreSchemas = schemas => {
		sandbox.stub(MongodbIndexCreator.prototype, 'coreSchemas')
			.get(() => schemas);
	};

	const setClientSchemas = schemas => {
		sandbox.stub(MongodbIndexCreator.prototype, 'clientSchemas')
			.get(() => schemas);
	};

	const setDatabaseConfig = config => {
		sandbox.stub(DatabaseDispatcher, 'config')
			.get(() => config);
	};

	class FakeMongoDB {

		indexes() {}

		createIndex() {}

		dropIndexes() {}

		collection() {
			return {
				indexes: this.indexes.bind(this),
				createIndex: this.createIndex.bind(this),
				dropIndexes: this.dropIndexes.bind(this)
			};
		}

		db() {
			return {
				collection: this.collection.bind(this)
			};
		}
	}

	afterEach(() => {
		DatabaseDispatcher.clearCache();
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
					},
					{
						name: 'existingIndex',
						key: { existingIndex: 1 }
					}
				],
				otherCollection: [
					{
						name: 'existingIndex',
						key: { existingIndex: 1 }
					}
				]
			},
			someDatabaseKey: {
				someCollection: [
					{
						name: 'someIndex',
						key: { someIndex: 1 }
					}
				]
			}
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

			setCoreSchemas(fakeCoreSchemas);

			sandbox.stub(MongoClient, 'connect')
				.returns(new FakeMongoDB());

			sandbox.spy(FakeMongoDB.prototype, 'db');

			sandbox.stub(FakeMongoDB.prototype, 'createIndex')
				.returns();

			sandbox.stub(FakeMongoDB.prototype, 'dropIndexes')
				.returns();

			sandbox.stub(FakeMongoDB.prototype, 'indexes');

			FakeMongoDB.prototype.indexes.onFirstCall()
				.returns([
					{
						name: 'existingIndex',
						key: { existingIndex: 1 }
					}
				]);

			FakeMongoDB.prototype.indexes.onSecondCall()
				.returns([
					{
						name: 'existingIndex',
						key: { existingIndex: 1 }
					}
				]);

			FakeMongoDB.prototype.indexes.onThirdCall()
				.returns([
					{
						name: 'deprecatedIndex',
						key: { deprecatedIndex: 1 }
					}
				]);

			await mongodbIndexCreator.createCoreIndexes();

			sandbox.assert.calledTwice(MongoClient.connect);

			sandbox.assert.calledTwice(FakeMongoDB.prototype.db);
			sandbox.assert.calledWithExactly(FakeMongoDB.prototype.db.getCall(0), 'core');
			sandbox.assert.calledWithExactly(FakeMongoDB.prototype.db.getCall(1), 'some-core-db');

			sandbox.assert.calledThrice(FakeMongoDB.prototype.indexes);

			sandbox.assert.calledOnce(FakeMongoDB.prototype.dropIndexes);
			sandbox.assert.calledWithExactly(FakeMongoDB.prototype.dropIndexes, ['deprecatedIndex']);

			sandbox.assert.calledTwice(FakeMongoDB.prototype.createIndex);
			sandbox.assert.calledWithExactly(FakeMongoDB.prototype.createIndex.getCall(0), { myIndex: 1 }, { name: 'myIndex', unique: true });
			sandbox.assert.calledWithExactly(FakeMongoDB.prototype.createIndex.getCall(1), { someIndex: 1 }, { name: 'someIndex' });
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

			setCoreSchemas(fakeCoreSchemas);

			sandbox.stub(MongoClient, 'connect')
				.throws();

			await assert.rejects(mongodbIndexCreator.createCoreIndexes(), {
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

			setCoreSchemas(fakeCoreSchemas);

			sandbox.stub(DatabaseDispatcher, '_getDBDriver')
				.returns(new class MySQL {}());

			await assert.rejects(mongodbIndexCreator.createCoreIndexes(), {
				name: 'MongodbIndexCreatorError',
				code: MongodbIndexCreatorError.codes.INVALID_DATABASE_TYPE
			});
		});

		describe('Schemas file errors', () => {

			[null, undefined, 1, 'string', ['array']].forEach(values => {

				it('Should throw when the received core schemas is not an object (not an array) or not exists', async () => {

					setCoreSchemas(values);

					await assert.rejects(mongodbIndexCreator.createCoreIndexes(), {
						name: 'MongodbIndexCreatorError',
						code: MongodbIndexCreatorError.codes.INVALID_CORE_SCHEMAS
					});
				});

				it('Should throw when the databaseKeys from the core schemas is not an object (not an array) or not exists', async () => {

					setDatabaseConfig({ core: fakeDbConfig });

					setCoreSchemas({ core: values });

					await assert.rejects(mongodbIndexCreator.createCoreIndexes(), {
						name: 'MongodbIndexCreatorError',
						code: MongodbIndexCreatorError.codes.INVALID_COLLECTIONS
					});
				});
			});

			[null, undefined, 'string', 1, { some: 'object' }, { key: { someIndex: 1 } }].forEach(indexes => {

				it('Should throw when the indexes from the received databaseKeys is not an array or not exists', async () => {

					setDatabaseConfig({ core: fakeDbConfig });

					setCoreSchemas({ core: { myCollection: indexes } });

					await assert.rejects(mongodbIndexCreator.createCoreIndexes(), {
						name: 'MongodbIndexCreatorError',
						code: MongodbIndexCreatorError.codes.INVALID_COLLECTION_INDEXES
					});
				});

				it('Should throw when the indexes from the received databaseKeys are invalid', async () => {

					setDatabaseConfig({ core: fakeDbConfig });

					setCoreSchemas({ core: { myCollection: [indexes] } });

					await assert.rejects(mongodbIndexCreator.createCoreIndexes(), {
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
					name: 'someIndex',
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

		beforeEach(() => {

			sandbox.stub(MongoClient, 'connect')
				.returns(new FakeMongoDB());

			sandbox.spy(FakeMongoDB.prototype, 'db');

			sandbox.stub(FakeMongoDB.prototype, 'createIndex')
				.returns();

			sandbox.stub(FakeMongoDB.prototype, 'dropIndexes')
				.returns();

			sandbox.stub(FakeMongoDB.prototype, 'indexes')
				.returns();

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

			setClientSchemas(fakeClientSchemas);

			setDatabaseWriteType('mongodb');

			await mongodbIndexCreator.createClientIndexes([{
				code: 'some-client',
				dbHost: 'some-host',
				dbDatabase: 'some-db'
			}]);

			sandbox.assert.calledOnce(MongoClient.connect);

			sandbox.assert.calledOnce(FakeMongoDB.prototype.db);
			sandbox.assert.calledWithExactly(FakeMongoDB.prototype.db, 'some-db');

			sandbox.assert.calledTwice(FakeMongoDB.prototype.indexes);

			sandbox.assert.calledTwice(FakeMongoDB.prototype.createIndex);
			sandbox.assert.calledWithExactly(FakeMongoDB.prototype.createIndex.getCall(0), { myIndex: 1 }, { name: 'myIndex', unique: true });
			sandbox.assert.calledWithExactly(FakeMongoDB.prototype.createIndex.getCall(1), { someIndex: 1 }, { name: 'someIndex' });
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

			setClientSchemas(fakeClientSchemas);

			setDatabaseWriteType('mongodb');
			setDatabaseReadType('mongodb');

			await mongodbIndexCreator.createClientIndexes([{
				code: 'other-client',
				dbHost: 'other-host',
				dbDatabase: 'other-db',
				dbReadHost: 'read-host',
				dbReadDatabase: 'read-db'
			}]);

			sandbox.assert.calledTwice(MongoClient.connect);

			sandbox.assert.calledTwice(FakeMongoDB.prototype.db);
			sandbox.assert.calledWithExactly(FakeMongoDB.prototype.db.getCall(0), 'other-db');
			sandbox.assert.calledWithExactly(FakeMongoDB.prototype.db.getCall(1), 'read-db');

			sandbox.assert.callCount(FakeMongoDB.prototype.indexes, 4);

			sandbox.assert.callCount(FakeMongoDB.prototype.createIndex, 4);

			// For other-db
			sandbox.assert.calledWithExactly(FakeMongoDB.prototype.createIndex.getCall(0), { myIndex: 1 }, { name: 'myIndex', unique: true });
			sandbox.assert.calledWithExactly(FakeMongoDB.prototype.createIndex.getCall(1), { someIndex: 1 }, { name: 'someIndex' });

			// For read-db
			sandbox.assert.calledWithExactly(FakeMongoDB.prototype.createIndex.getCall(2), { myIndex: 1 }, { name: 'myIndex', unique: true });
			sandbox.assert.calledWithExactly(FakeMongoDB.prototype.createIndex.getCall(3), { someIndex: 1 }, { name: 'someIndex' });
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

			setClientSchemas(fakeClientSchemas);

			setDatabaseWriteType('mongodb');
			setDatabaseReadType('mongodb');

			await mongodbIndexCreator.createClientIndexes([{
				code: 'some-other-client',
				dbHost: 'some-other-host',
				dbDatabase: 'some-other-db',
				dbReadHost: 'some-other-host',
				dbReadDatabase: 'some-other-db'
			}]);

			sandbox.assert.calledOnce(MongoClient.connect);

			sandbox.assert.calledOnce(FakeMongoDB.prototype.db);
			sandbox.assert.calledWithExactly(FakeMongoDB.prototype.db, 'some-other-db');

			sandbox.assert.calledTwice(FakeMongoDB.prototype.indexes);

			sandbox.assert.calledTwice(FakeMongoDB.prototype.createIndex);
			sandbox.assert.calledWithExactly(FakeMongoDB.prototype.createIndex.getCall(0), { myIndex: 1 }, { name: 'myIndex', unique: true });
			sandbox.assert.calledWithExactly(FakeMongoDB.prototype.createIndex.getCall(1), { someIndex: 1 }, { name: 'someIndex' });
		});

		it('Should throw when can\'t connect to target MongoDB database', async () => {

			setClientConfig({
				write: {
					dbHost: 'host',
					dbDatabase: 'database'
				}
			});

			setClientSchemas(fakeClientSchemas);

			setDatabaseWriteType('mongodb');

			MongoClient.connect
				.throws();

			await assert.rejects(mongodbIndexCreator.createClientIndexes([{
				code: 'fake-client',
				dbHost: 'fake-host',
				dbDatabase: 'fake-client-db'
			}]), {
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

			setClientSchemas(fakeClientSchemas);

			setDatabaseWriteType('mysql');

			sandbox.stub(DatabaseDispatcher, '_getDBDriver')
				.returns(new class MySQL {}());

			await assert.rejects(mongodbIndexCreator.createClientIndexes([{
				code: 'fake-client',
				dbHost: 'fake-host',
				dbDatabase: 'fake-db'
			}]), {
				name: 'MongodbIndexCreatorError',
				code: MongodbIndexCreatorError.codes.INVALID_DATABASE_TYPE
			});
		});

		describe('Schemas file errors', () => {

			[null, undefined, 1, 'string', ['array']].forEach(values => {

				it('Should throw when the received client schemas is not an object (not an array) or not exists', async () => {

					setClientSchemas(values);

					await assert.rejects(mongodbIndexCreator.createClientIndexes([]), {
						name: 'MongodbIndexCreatorError',
						code: MongodbIndexCreatorError.codes.INVALID_CLIENT_SCHEMAS
					});
				});
			});

			[null, undefined, 'string', 1, { some: 'object' }].forEach(indexes => {

				it('Should throw when the indexes from the received client schemas is not an array or not exists', async () => {

					setClientSchemas({ myCollection: indexes });

					await assert.rejects(mongodbIndexCreator.createClientIndexes([]), {
						name: 'MongodbIndexCreatorError',
						code: MongodbIndexCreatorError.codes.INVALID_COLLECTION_INDEXES
					});
				});

				it('Should throw when the indexes from the received client schemas are invalid', async () => {

					setClientSchemas({ myCollection: [indexes] });

					await assert.rejects(mongodbIndexCreator.createClientIndexes([]), {
						name: 'MongodbIndexCreatorError',
						code: MongodbIndexCreatorError.codes.INVALID_COLLECTION_INDEXES
					});
				});
			});
		});
	});

	describe('executeForCoreDatabases()', () => {

		const mongodbIndexCreator = new MongodbIndexCreator();

		it('Should call createCoreIndexes() when coreSchemas exists', async () => {

			setCoreSchemas({});

			sandbox.stub(MongodbIndexCreator.prototype, 'createCoreIndexes')
				.returns();

			await mongodbIndexCreator.executeForCoreDatabases();

			sandbox.assert.calledOnce(MongodbIndexCreator.prototype.createCoreIndexes);
		});

		it('Should not call createCoreIndexes() when coreSchemas not exists', async () => {

			setCoreSchemas();

			sandbox.stub(MongodbIndexCreator.prototype, 'createCoreIndexes')
				.returns();

			await mongodbIndexCreator.executeForCoreDatabases();

			sandbox.assert.notCalled(MongodbIndexCreator.prototype.createCoreIndexes);
		});
	});

	describe('executeForClientDatabases()', () => {

		const mongodbIndexCreator = new MongodbIndexCreator();

		it('Should call createClientIndexes() when clientSchemas exists', async () => {

			setClientSchemas({});

			sandbox.stub(ModelClient.prototype, 'getDb')
				.returns();

			sandbox.stub(ModelClient.prototype, 'get')
				.returns([
					{ code: 'some-client' }
				]);

			sandbox.stub(MongodbIndexCreator.prototype, 'createClientIndexes')
				.returns();

			await mongodbIndexCreator.executeForClientDatabases();

			sandbox.assert.calledOnce(ModelClient.prototype.get);

			sandbox.assert.calledOnce(MongodbIndexCreator.prototype.createClientIndexes);
			sandbox.assert.calledWithExactly(MongodbIndexCreator.prototype.createClientIndexes, [{ code: 'some-client' }]);
		});

		it('Should not call createClientIndexes() when there are not clients', async () => {

			setClientSchemas({});

			sandbox.stub(ModelClient.prototype, 'getDb')
				.returns();

			sandbox.stub(ModelClient.prototype, 'get')
				.returns([]);

			sandbox.stub(MongodbIndexCreator.prototype, 'createClientIndexes')
				.returns();

			await mongodbIndexCreator.executeForClientDatabases();

			sandbox.assert.calledOnce(ModelClient.prototype.get);

			sandbox.assert.notCalled(MongodbIndexCreator.prototype.createClientIndexes);
		});

		it('Should not call createClientIndexes() when clientSchemas not exists', async () => {

			setClientSchemas();

			sandbox.stub(MongodbIndexCreator.prototype, 'createClientIndexes')
				.returns();

			await mongodbIndexCreator.executeForClientDatabases();

			sandbox.assert.notCalled(MongodbIndexCreator.prototype.createClientIndexes);
		});

		it('Should throw when the ClientModel fails', async () => {

			setClientSchemas({});

			sandbox.stub(ModelClient.prototype, 'get')
				.throws();

			await assert.rejects(mongodbIndexCreator.executeForClientDatabases(), {
				name: 'MongodbIndexCreatorError',
				code: MongodbIndexCreatorError.codes.MODEL_CLIENT_ERROR
			});
		});
	});

	describe('executeForClientCode()', () => {

		const mongodbIndexCreator = new MongodbIndexCreator();

		it('Should call createClientIndexes() when clientSchemas exists', async () => {

			setClientSchemas({});

			sandbox.stub(ModelClient.prototype, 'getDb')
				.returns();

			sandbox.stub(ModelClient.prototype, 'getByClientCode')
				.returns({ code: 'some-client' });

			sandbox.stub(MongodbIndexCreator.prototype, 'createClientIndexes')
				.returns();

			await mongodbIndexCreator.executeForClientCode('some-client');

			sandbox.assert.calledOnce(ModelClient.prototype.getByClientCode);
			sandbox.assert.calledWithExactly(ModelClient.prototype.getByClientCode, 'some-client');

			sandbox.assert.calledOnce(MongodbIndexCreator.prototype.createClientIndexes);
			sandbox.assert.calledWithExactly(MongodbIndexCreator.prototype.createClientIndexes, [{ code: 'some-client' }]);
		});

		it('Should not call createClientIndexes() when the specified client not exists', async () => {

			setClientSchemas({});

			sandbox.stub(ModelClient.prototype, 'getDb')
				.returns();

			sandbox.stub(ModelClient.prototype, 'getByClientCode')
				.returns();

			sandbox.stub(MongodbIndexCreator.prototype, 'createClientIndexes')
				.returns();

			await mongodbIndexCreator.executeForClientCode('some-client');

			sandbox.assert.calledOnce(ModelClient.prototype.getByClientCode);
			sandbox.assert.calledWithExactly(ModelClient.prototype.getByClientCode, 'some-client');

			sandbox.assert.notCalled(MongodbIndexCreator.prototype.createClientIndexes);
		});

		it('Should not call createClientIndexes() when clientSchemas not exists', async () => {

			setClientSchemas();

			sandbox.stub(MongodbIndexCreator.prototype, 'createClientIndexes')
				.returns();

			await mongodbIndexCreator.executeForClientCode('some-client');

			sandbox.assert.notCalled(MongodbIndexCreator.prototype.createClientIndexes);
		});

		it('Should throw when the ClientModel fails', async () => {

			setClientSchemas({});

			sandbox.stub(ModelClient.prototype, 'get')
				.throws();

			await assert.rejects(mongodbIndexCreator.executeForClientCode('some-client'), {
				name: 'MongodbIndexCreatorError',
				code: MongodbIndexCreatorError.codes.MODEL_CLIENT_ERROR
			});
		});
	});
	/* describe('execute()', () => {

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
	}); */
});
