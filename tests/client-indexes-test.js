'use strict';

const assert = require('assert');

const sandbox = require('sinon').createSandbox();
const mockRequire = require('mock-require');
const path = require('path');
const fs = require('fs');

const MongodbIndexCreator = require('../lib/mongodb-index-creator');
const { Client, Models, Results } = require('../lib/helpers');

const ClientModel = require('./models/client/client');
const SimpleModel = require('./models/client/simple');
const EmptyModel = require('./models/client/empty');

const SimpleReadModel = require('./models/client/simple-read');

const SimpleCoreModel = require('./models/core/simple');

const defaultIndex = require('./default-index');

require('../lib/colorful-lllog')('none');

describe('MongodbIndexCreator - Client Indexes', () => {

	afterEach(() => {
		sandbox.restore();
		mockRequire.stopAll();
		Results.results = null;
	});

	const loadClient = (addRead = false) => {

		mockRequire(Client.getRelativePath(), ClientModel);

		sandbox.stub(ClientModel.prototype, 'getIndexes')
			.resolves([defaultIndex]);

		sandbox.stub(ClientModel.prototype, 'dropIndexes')
			.resolves(true);

		sandbox.stub(ClientModel.prototype, 'createIndexes')
			.resolves(true);

		sandbox.stub(ClientModel.prototype, 'get')
			.resolves([{
				code: 'the-client-code',
				databases: {
					default: {
						write: {},
						...addRead ? { read: {} } : {}
					}
				}
			}]);
	};

	const execute = () => {
		const mongodbIndexCreator = new MongodbIndexCreator();
		return mongodbIndexCreator.executeForClientDatabases();
	};

	const executeForCode = code => {
		const mongodbIndexCreator = new MongodbIndexCreator();
		return mongodbIndexCreator.executeForClientCode(code);
	};

	context('when valid indexes found in models', () => {

		it('shouldn\'t create or drop any indexes if no index in model and collection', async () => {

			loadClient();

			sandbox.stub(fs, 'readdirSync')
				.returns(['empty.js']);

			mockRequire(path.join(Models.path, 'empty.js'), EmptyModel);

			sandbox.stub(EmptyModel.prototype, 'getIndexes')
				.resolves([defaultIndex]);

			sandbox.stub(EmptyModel.prototype, 'dropIndexes')
				.resolves(true);

			sandbox.stub(EmptyModel.prototype, 'createIndexes')
				.resolves(true);

			await execute();

			sandbox.assert.notCalled(EmptyModel.prototype.dropIndexes);
			sandbox.assert.notCalled(EmptyModel.prototype.createIndexes);
		});

		it('shouldn\'t create or drop any indexes if no changes in indexes', async () => {

			loadClient();

			sandbox.stub(fs, 'readdirSync')
				.returns(['simple.js']);

			mockRequire(path.join(Models.path, 'simple.js'), SimpleModel);

			sandbox.stub(SimpleModel.prototype, 'getIndexes')
				.resolves([defaultIndex, {
					name: 'field',
					key: { field: 1 }
				}]);

			sandbox.stub(SimpleModel.prototype, 'dropIndexes')
				.resolves(true);

			sandbox.stub(SimpleModel.prototype, 'createIndexes')
				.resolves(true);

			await execute();

			sandbox.assert.notCalled(SimpleModel.prototype.dropIndexes);
			sandbox.assert.notCalled(SimpleModel.prototype.createIndexes);
		});

		it('should create a client index and save results', async () => {

			loadClient();

			sandbox.stub(fs, 'readdirSync')
				.returns(['simple.js']);

			mockRequire(path.join(Models.path, 'simple.js'), SimpleModel);

			sandbox.stub(SimpleModel.prototype, 'getIndexes')
				.resolves([defaultIndex]);

			sandbox.stub(SimpleModel.prototype, 'dropIndexes')
				.resolves(true);

			sandbox.stub(SimpleModel.prototype, 'createIndexes')
				.resolves(true);

			await execute();

			sandbox.assert.notCalled(SimpleModel.prototype.dropIndexes);

			sandbox.assert.calledOnceWithExactly(SimpleModel.prototype.createIndexes, [{
				name: 'field',
				key: { field: 1 }
			}]);

			assert.deepStrictEqual(Results.results, {
				[`the-client-code.${SimpleModel.prototype.databaseKey}.write.${SimpleModel.table}`]: {
					created: ['field']
				}
			});
		});

		it('should drop a client index', async () => {

			loadClient();

			sandbox.stub(fs, 'readdirSync')
				.returns(['empty.js']);

			mockRequire(path.join(Models.path, 'empty.js'), EmptyModel);

			sandbox.stub(EmptyModel.prototype, 'getIndexes')
				.resolves([defaultIndex, {
					name: 'oldIndex',
					key: { oldIndex: 1 }
				}]);

			sandbox.stub(EmptyModel.prototype, 'dropIndexes')
				.resolves(true);

			sandbox.stub(EmptyModel.prototype, 'createIndexes')
				.resolves(true);

			await execute();

			sandbox.assert.calledOnceWithExactly(EmptyModel.prototype.dropIndexes, ['oldIndex']);

			sandbox.assert.notCalled(EmptyModel.prototype.createIndexes);
		});

		it('should create and drop client indexex', async () => {

			loadClient();

			sandbox.stub(fs, 'readdirSync')
				.returns(['simple.js']);

			mockRequire(path.join(Models.path, 'simple.js'), SimpleModel);

			sandbox.stub(SimpleModel.prototype, 'getIndexes')
				.resolves([defaultIndex, {
					name: 'oldIndex',
					key: { oldIndex: 1 }
				}]);

			sandbox.stub(SimpleModel.prototype, 'dropIndexes')
				.resolves(true);

			sandbox.stub(SimpleModel.prototype, 'createIndexes')
				.resolves(true);

			await execute();

			sandbox.assert.calledOnceWithExactly(SimpleModel.prototype.dropIndexes, ['oldIndex']);

			sandbox.assert.calledOnceWithExactly(SimpleModel.prototype.createIndexes, [{
				name: 'field',
				key: { field: 1 }
			}]);

		});

		it('should process only for client when is executed with executeForClientCode(code)', async () => {

			loadClient();

			sandbox.stub(fs, 'readdirSync')
				.returns(['simple.js', 'core-simple.js']);

			mockRequire(path.join(Models.path, 'simple.js'), SimpleModel);
			mockRequire(path.join(Models.path, 'core-simple.js'), SimpleCoreModel);

			sandbox.stub(SimpleModel.prototype, 'getIndexes')
				.resolves([defaultIndex]);

			sandbox.stub(SimpleModel.prototype, 'dropIndexes')
				.resolves(true);

			sandbox.stub(SimpleModel.prototype, 'createIndexes')
				.resolves(true);

			sandbox.stub(SimpleCoreModel.prototype, 'getIndexes');

			sandbox.stub(SimpleCoreModel.prototype, 'dropIndexes');

			sandbox.stub(SimpleCoreModel.prototype, 'createIndexes');

			await executeForCode('the-client-code');

			sandbox.assert.notCalled(SimpleModel.prototype.dropIndexes);

			sandbox.assert.calledOnceWithExactly(SimpleModel.prototype.createIndexes, [{
				name: 'field',
				key: { field: 1 }
			}]);

			sandbox.assert.notCalled(SimpleCoreModel.prototype.getIndexes);
			sandbox.assert.notCalled(SimpleCoreModel.prototype.createIndexes);
			sandbox.assert.notCalled(SimpleCoreModel.prototype.dropIndexes);

		});

		context('when model has read db', () => {

			it('should create a client index when write and read databases present', async () => {

				loadClient(true);

				sandbox.stub(fs, 'readdirSync')
					.returns(['simple.js']);

				mockRequire(path.join(Models.path, 'simple.js'), SimpleReadModel);

				sandbox.stub(SimpleReadModel.prototype, 'getIndexes')
					.resolves([defaultIndex]);

				sandbox.stub(SimpleReadModel.prototype, 'dropIndexes')
					.resolves(true);

				sandbox.stub(SimpleReadModel.prototype, 'createIndexes')
					.resolves(true);

				await execute();

				sandbox.assert.notCalled(SimpleReadModel.prototype.dropIndexes);

				sandbox.assert.calledTwice(SimpleReadModel.prototype.createIndexes);

				sandbox.assert.calledWithExactly(SimpleReadModel.prototype.createIndexes, [{
					name: 'field',
					key: { field: 1 }
				}]);
			});

			it('should create and drop client indexex for read database', async () => {

				loadClient(true);

				sandbox.stub(fs, 'readdirSync')
					.returns(['simple.js']);

				mockRequire(path.join(Models.path, 'simple.js'), SimpleReadModel);

				sandbox.stub(SimpleReadModel.prototype, 'getIndexes')
					.onCall(0)
					.resolves([defaultIndex, {
						name: 'field',
						key: { field: 1 }
					}])
					.onCall(1)
					.resolves([defaultIndex, {
						name: 'wrongField',
						key: { wrongField: 1 }
					}]);

				sandbox.stub(SimpleReadModel.prototype, 'dropIndexes')
					.resolves(true);

				sandbox.stub(SimpleReadModel.prototype, 'createIndexes')
					.resolves(true);

				await execute();

				// se dropea para la base read
				sandbox.assert.calledOnceWithExactly(SimpleReadModel.prototype.dropIndexes, ['wrongField']);

				// se crea para la base read
				sandbox.assert.calledOnceWithExactly(SimpleReadModel.prototype.createIndexes, [{
					name: 'field',
					key: { field: 1 }
				}]);

				assert.deepStrictEqual(Results.results, {
					[`the-client-code.${SimpleReadModel.prototype.databaseKey}.read.${SimpleReadModel.table}`]: {
						created: ['field'],
						dropped: ['wrongField']
					}
				});
			});
		});

	});

	context('when client not found', () => {
		it('shouldn\'t process indexes', async () => {

			mockRequire(Client.getRelativePath(), ClientModel);

			sandbox.stub(ClientModel.prototype, 'get')
				.resolves([]);

			sandbox.stub(fs, 'readdirSync')
				.returns(['simple.js']);

			mockRequire(path.join(Models.path, 'simple.js'), SimpleModel);

			sandbox.stub(SimpleModel.prototype, 'getIndexes');
			sandbox.stub(SimpleModel.prototype, 'dropIndexes');
			sandbox.stub(SimpleModel.prototype, 'createIndexes');

			await executeForCode('the-client-code');

			sandbox.assert.notCalled(SimpleModel.prototype.getIndexes);
			sandbox.assert.notCalled(SimpleModel.prototype.createIndexes);
			sandbox.assert.notCalled(SimpleModel.prototype.dropIndexes);
		});
	});

	context('when model client rejects', () => {
		it('shouldn\'t process indexes', async () => {

			mockRequire(Client.getRelativePath(), ClientModel);

			sandbox.stub(ClientModel.prototype, 'get')
				.rejects('some error');

			sandbox.stub(fs, 'readdirSync')
				.returns(['simple.js']);

			mockRequire(path.join(Models.path, 'simple.js'), SimpleModel);

			sandbox.stub(SimpleModel.prototype, 'getIndexes');
			sandbox.stub(SimpleModel.prototype, 'dropIndexes');
			sandbox.stub(SimpleModel.prototype, 'createIndexes');

			await execute();

			sandbox.assert.notCalled(SimpleModel.prototype.getIndexes);
			sandbox.assert.notCalled(SimpleModel.prototype.createIndexes);
			sandbox.assert.notCalled(SimpleModel.prototype.dropIndexes);
		});
	});
});
