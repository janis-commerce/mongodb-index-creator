'use strict';

const assert = require('assert');

const path = require('path');
const sandbox = require('sinon').createSandbox();

const MongodbIndexCreator = require('../lib/mongodb-index-creator');

const serverlessFunction = require('../lib/serverless-function');

require('../lib/colorful-lllog')('none');

describe('index', () => {

	beforeEach(() => {
		sandbox.stub(process, 'exit').returns();
	});

	afterEach(() => {
		sandbox.restore();
		delete require.cache[path.join(process.cwd(), 'index.js')]; // clear require cache
	});

	const test = async () => {
		const index = require('../index'); // eslint-disable-line global-require, no-unused-vars

		await index;

		sandbox.assert.calledOnce(MongodbIndexCreator.prototype.execute);
	};

	it('Should run the index script and execute method for core and client databases', async () => {

		sandbox.stub(MongodbIndexCreator.prototype, 'execute')
			.returns();

		await test();
	});

	it('Should run the index script and execute method for core and client databases (process fails)', async () => {

		sandbox.stub(MongodbIndexCreator.prototype, 'execute')
			.rejects();

		await test();
	});
});

describe('get serverlessFunction', () => {

	it('Should return the serverless function', () => {
		assert.deepStrictEqual(MongodbIndexCreator.serverlessFunction, serverlessFunction);
	});
});
