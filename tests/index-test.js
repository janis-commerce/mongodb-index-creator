'use strict';

const path = require('path');
const sandbox = require('sinon').createSandbox();

const MongodbIndexCreator = require('../lib/mongodb-index-creator');

require('../lib/utils/colorful-lllog')('none');

describe('index', () => {

	beforeEach(() => {
		sandbox.stub(process, 'exit').returns();
	});

	afterEach(() => {
		sandbox.restore();
		delete require.cache[path.join(process.cwd(), 'index.js')]; // clear require cache
	});

	it('Should run the index script the call MongodbIndexCreator.execute()', async () => {

		sandbox.stub(MongodbIndexCreator.prototype, 'execute')
			.returns();

		const index = require('../index'); // eslint-disable-line global-require, no-unused-vars

		sandbox.assert.calledOnce(MongodbIndexCreator.prototype.execute);
	});

	it('Should run the index script the call MongodbIndexCreator.execute()', async () => {

		sandbox.stub(MongodbIndexCreator.prototype, 'execute')
			.rejects();

		const index = require('../index'); // eslint-disable-line global-require, no-unused-vars

		sandbox.assert.calledOnce(MongodbIndexCreator.prototype.execute);
	});
});
