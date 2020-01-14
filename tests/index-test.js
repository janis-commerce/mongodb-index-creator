'use strict';

const path = require('path');
const sandbox = require('sinon').createSandbox();

const Schemas = require('../lib/helpers/schemas');

const MongodbIndexCreator = require('../lib/mongodb-index-creator');

require('../lib/colorful-lllog')('none');

describe('index', () => {

	const setCoreSchemas = schemas => {
		sandbox.stub(Schemas.prototype, 'core')
			.get(() => schemas);
	};

	const setClientSchemas = schemas => {
		sandbox.stub(Schemas.prototype, 'client')
			.get(() => schemas);
	};

	beforeEach(() => {
		sandbox.stub(process, 'exit').returns();
	});

	afterEach(() => {
		sandbox.restore();
		delete require.cache[path.join(process.cwd(), 'index.js')]; // clear require cache
	});

	it('Should run the index script and execute method for core and client databases', async () => {

		setCoreSchemas({});

		setClientSchemas({});

		sandbox.stub(MongodbIndexCreator.prototype, 'executeForCoreDatabases')
			.returns();

		sandbox.stub(MongodbIndexCreator.prototype, 'executeForClientDatabases')
			.returns();

		const index = require('../index'); // eslint-disable-line global-require, no-unused-vars

		await index;

		sandbox.assert.calledOnce(MongodbIndexCreator.prototype.executeForCoreDatabases);

		sandbox.assert.calledOnce(MongodbIndexCreator.prototype.executeForClientDatabases);
	});

	it('Should run the index script and execute method for core and client databases (process fails)', async () => {

		setCoreSchemas({});

		sandbox.stub(MongodbIndexCreator.prototype, 'executeForCoreDatabases')
			.rejects();

		const index = require('../index'); // eslint-disable-line global-require, no-unused-vars

		await index;

		sandbox.assert.calledOnce(MongodbIndexCreator.prototype.executeForCoreDatabases);
	});
});
