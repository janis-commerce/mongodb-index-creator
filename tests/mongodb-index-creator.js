'use strict';

require('lllog')('none');

const sinon = require('sinon');
const mockRequire = require('mock-require');
const fs = require('fs');

const { Handler, Invoker } = require('@janiscommerce/lambda');

const { MongoDBIndexCreator } = require('../lib');

const {
	mockModel,
	ClientSimpleModel,
	ClientEmptyModel,
	CoreSimpleModel,
	CoreEmptyModel,
	NotModel
} = require('./models');

describe('MongodbIndexCreator', () => {

	const originalEnv = { ...process.env };

	beforeEach(() => {
		process.env.JANIS_SERVICE_NAME = 'test-service';
		sinon.stub(Invoker, 'serviceCall')
			.resolves();
	});

	afterEach(() => {
		process.env = { ...originalEnv };
		sinon.restore();
		mockRequire.stopAll();
	});

	it('Should invoke IndexCreatorDispatcher function with models found in service', async () => {

		mockModel(sinon, {
			'core-empty.js': CoreEmptyModel,
			'core-simple.js': CoreSimpleModel,
			'client-empty.js': ClientEmptyModel,
			'client-simple.js': ClientSimpleModel
		});

		await Handler.handle(MongoDBIndexCreator);

		sinon.assert.calledOnceWithExactly(Invoker.serviceCall, 'devops', 'IndexCreatorDispatcher', {
			serviceCode: 'test-service',
			models: [
				{
					collectionName: 'core-empty',
					databaseKey: 'core',
					indexes: []
				},
				{
					collectionName: 'core-simple',
					databaseKey: 'core',
					indexes: [{
						name: 'field',
						key: { field: 1 }
					}]
				},
				{
					collectionName: 'client-empty',
					databaseKey: 'default',
					indexes: []
				},
				{
					collectionName: 'client-simple',
					databaseKey: 'default',
					indexes: [{
						name: 'field',
						key: { field: 1 }
					}]
				}
			]
		});

	});

	it('Should invoke IndexCreatorDispatcher function with clientCode parameter if provided', async () => {

		mockModel(sinon, {
			'core-simple.js': CoreSimpleModel,
			'client-simple.js': ClientSimpleModel
		});

		await Handler.handle(MongoDBIndexCreator, { body: { clientCode: 'default-client' } });

		sinon.assert.calledOnceWithExactly(Invoker.serviceCall, 'devops', 'IndexCreatorDispatcher', {
			serviceCode: 'test-service',
			models: [
				{
					collectionName: 'core-simple',
					databaseKey: 'core',
					indexes: [{
						name: 'field',
						key: { field: 1 }
					}]
				},
				{
					collectionName: 'client-simple',
					databaseKey: 'default',
					indexes: [{
						name: 'field',
						key: { field: 1 }
					}]
				}
			],
			clientCode: 'default-client'
		});

	});

	it('Should not invoke IndexCreatorDispatcher function if no models are found', async () => {

		mockModel(sinon, {});

		await Handler.handle(MongoDBIndexCreator);

		sinon.assert.notCalled(Invoker.serviceCall);
	});

	it('Should not invoke IndexCreatorDispatcher when only invalid models are found', async () => {

		mockModel(sinon, {
			'not-model.js': NotModel
		});

		await Handler.handle(MongoDBIndexCreator);

		sinon.assert.notCalled(Invoker.serviceCall);
	});

	it('Should not invoke IndexCreatorDispatcher when readdirSync throws', async () => {

		sinon.stub(fs, 'readdirSync')
			.throws(new Error('Some fs error'));

		await Handler.handle(MongoDBIndexCreator);

		sinon.assert.notCalled(Invoker.serviceCall);
	});
});
