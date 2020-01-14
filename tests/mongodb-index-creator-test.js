'use strict';

const path = require('path');
const assert = require('assert');
const sandbox = require('sinon').createSandbox();

const Model = require('@janiscommerce/model');

const Settings = require('@janiscommerce/settings');

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
		sandbox.stub(Settings, 'get')
			.withArgs('database')
			.returns(config);
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

			sandbox.stub(Model.prototype, 'createIndexes');

			Model.prototype.createIndexes
				.returns(true);

			Model.prototype.createIndexes
				.onSecondCall()
				.returns(false);

			sandbox.stub(Model.prototype, 'dropIndexes');

			Model.prototype.dropIndexes
				.returns(true);

			Model.prototype.dropIndexes
				.onSecondCall()
				.returns(false);

			sandbox.stub(Model.prototype, 'getIndexes');

			Model.prototype.getIndexes.onFirstCall()
				.returns([
					{
						name: '_id_',
						key: { _id: 1 },
						unique: true
					},
					{
						name: 'existingIndex',
						key: { existingIndex: 1 }
					}
				]);

			Model.prototype.getIndexes.onSecondCall()
				.returns([
					{
						name: '_id_',
						key: { _id: 1 },
						unique: true
					},
					{
						name: 'existingIndex',
						key: { existingIndex: 1 }
					},
					{
						name: 'deprecatedIndex',
						key: { deprecatedIndex: 1 }
					}
				]);

			Model.prototype.getIndexes.onThirdCall()
				.returns([
					{
						name: '_id_',
						key: { _id: 1 },
						unique: true
					},
					{
						name: 'otherDeprecatedIndex',
						key: { otherDeprecatedIndex: 1 }
					}

				]);

			await mongodbIndexCreator.createCoreIndexes();

			sandbox.assert.calledThrice(Model.prototype.getIndexes);

			sandbox.assert.calledTwice(Model.prototype.dropIndexes);
			sandbox.assert.calledWithExactly(Model.prototype.dropIndexes.getCall(0), ['deprecatedIndex']);
			sandbox.assert.calledWithExactly(Model.prototype.dropIndexes.getCall(1), ['otherDeprecatedIndex']);

			sandbox.assert.calledTwice(Model.prototype.createIndexes);
			sandbox.assert.calledWithExactly(Model.prototype.createIndexes.getCall(0), [{ name: 'myIndex', key: { myIndex: 1 }, unique: true }]);
			sandbox.assert.calledWithExactly(Model.prototype.createIndexes.getCall(1), [{ name: 'someIndex', key: { someIndex: 1 } }]);
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
			Settings.get.withArgs('client')
				.returns(config);
		};

		const setDatabaseWriteType = type => {
			Settings.get.withArgs('databaseWriteType')
				.returns(type);
		};

		const setDatabaseReadType = type => {
			Settings.get.withArgs('databaseReadType')
				.returns(type);
		};

		beforeEach(() => {

			sandbox.stub(Settings, 'get');

			sandbox.stub(Model.prototype, 'createIndexes')
				.returns(true);

			sandbox.stub(Model.prototype, 'dropIndexes')
				.returns(true);

			sandbox.stub(Model.prototype, 'getIndexes')
				.returns([]);
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

			sandbox.assert.callCount(Model.prototype.getIndexes, 4);

			sandbox.assert.callCount(Model.prototype.createIndexes, 4);
			sandbox.assert.calledWithExactly(Model.prototype.createIndexes.getCall(0), [{ name: 'myIndex', key: { myIndex: 1 }, unique: true }]);
			sandbox.assert.calledWithExactly(Model.prototype.createIndexes.getCall(1), [{ name: 'myIndex', key: { myIndex: 1 }, unique: true }]);
			sandbox.assert.calledWithExactly(Model.prototype.createIndexes.getCall(2), [{ name: 'someIndex', key: { someIndex: 1 } }]);
			sandbox.assert.calledWithExactly(Model.prototype.createIndexes.getCall(3), [{ name: 'someIndex', key: { someIndex: 1 } }]);
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

			sandbox.assert.callCount(Model.prototype.getIndexes, 4);

			sandbox.assert.callCount(Model.prototype.createIndexes, 4);

			// write-db
			sandbox.assert.calledWithExactly(Model.prototype.createIndexes.getCall(0), [{ name: 'myIndex', key: { myIndex: 1 }, unique: true }]);
			sandbox.assert.calledWithExactly(Model.prototype.createIndexes.getCall(2), [{ name: 'someIndex', key: { someIndex: 1 } }]);

			// read-db
			sandbox.assert.calledWithExactly(Model.prototype.createIndexes.getCall(1), [{ name: 'myIndex', key: { myIndex: 1 }, unique: true }]);
			sandbox.assert.calledWithExactly(Model.prototype.createIndexes.getCall(3), [{ name: 'someIndex', key: { someIndex: 1 } }]);
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

			sandbox.assert.callCount(Model.prototype.getIndexes, 4);

			sandbox.assert.callCount(Model.prototype.createIndexes, 4);

			sandbox.assert.calledWithExactly(Model.prototype.createIndexes.getCall(0), [{ name: 'myIndex', key: { myIndex: 1 }, unique: true }]);
			sandbox.assert.calledWithExactly(Model.prototype.createIndexes.getCall(1), [{ name: 'myIndex', key: { myIndex: 1 }, unique: true }]);
			sandbox.assert.calledWithExactly(Model.prototype.createIndexes.getCall(2), [{ name: 'someIndex', key: { someIndex: 1 } }]);
			sandbox.assert.calledWithExactly(Model.prototype.createIndexes.getCall(3), [{ name: 'someIndex', key: { someIndex: 1 } }]);
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

	describe('execute()', () => {

		it('Should create the indexes for core and client databases', async () => {

			const mongodbIndexCreator = new MongodbIndexCreator();

			setCoreSchemas({});

			setClientSchemas({});

			sandbox.stub(MongodbIndexCreator.prototype, 'executeForCoreDatabases')
				.returns();

			sandbox.stub(MongodbIndexCreator.prototype, 'executeForClientDatabases')
				.returns();

			await mongodbIndexCreator.execute();

			sandbox.assert.calledOnce(MongodbIndexCreator.prototype.executeForCoreDatabases);

			sandbox.assert.calledOnce(MongodbIndexCreator.prototype.executeForClientDatabases);
		});
	});
});
