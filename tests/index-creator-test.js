'use strict';

const assert = require('assert');
const sandbox = require('sinon').createSandbox();
const mockRequire = require('mock-require');
const path = require('path');

const Model = require('@janiscommerce/model');

const fakeSchemas = require('./fake-schemas.json');

require('../lib/colorful-lllog')('none');

const MongodbIndexCreator = require('../lib/mongodb-index-creator');

const fakeClientPath = path.join(process.cwd(), process.env.MS_PATH || '', 'models', 'client');
const fakeSchemasPath = path.join(process.cwd(), 'schemas', 'mongodb', 'indexes');

describe.only('MongodbIndexCreator', () => {

	const ModelClient = class ModelClient extends Model {};

	mockRequire(fakeClientPath, ModelClient);
	mockRequire(fakeSchemasPath, fakeSchemas);

	it('something', async () => {

		const mongodbIndexCreator = new MongodbIndexCreator();

		sandbox.stub(ModelClient.prototype, 'get').returns([
			{ name: 'foo' }
		]);

		mongodbIndexCreator.execute();
	});
	
});
