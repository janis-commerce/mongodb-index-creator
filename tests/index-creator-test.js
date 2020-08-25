'use strict';

const sandbox = require('sinon').createSandbox();
const mockRequire = require('mock-require');

const Model = require('@janiscommerce/model');

const fakeSchemas = require('./fake-schemas.json');

require('../lib/colorful-lllog')('none');

const MongodbIndexCreator = require('../lib/mongodb-index-creator');

const { Schemas, Client } = require('../lib/helpers');

describe.only('MongodbIndexCreator', () => {

	const ModelClient = class ModelClient extends Model {};

	mockRequire(Client.getRelativePath(), ModelClient);
	mockRequire(Schemas.schemasPath, fakeSchemas);

	it('something', async () => {

		const mongodbIndexCreator = new MongodbIndexCreator();

		sandbox.stub(ModelClient.prototype, 'get').resolves([
			{ name: 'client-a', databases: { default: { write: {} } } }
		]);

		sandbox.stub(ModelClient.prototype, 'getIndexes').resolves([
			{
				name: '_id_',
				key: { _id: 1 },
				unique: true
			},
			{
				name: 'bar',
				key: { bar: 1 }
			}
		]);

		sandbox.stub(Model.prototype, 'getIndexes').resolves([
			{
				name: '_id_',
				key: { _id: 1 },
				unique: true
			},
			{
				name: 'foo',
				key: { foo: 1 }
			}
		]);

		sandbox.stub(Model.prototype, 'dropIndexes').resolves(true);
		sandbox.stub(Model.prototype, 'createIndexes').resolves(true);

		mongodbIndexCreator.execute();
	});
	
});
