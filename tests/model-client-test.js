'use strict';

const assert = require('assert');
const sinon = require('sinon');

const Settings = require('@janiscommerce/settings');

const ModelClient = require('../lib/model-client');

describe('Client Model', () => {

	const modelClient = new ModelClient();

	afterEach(() => {
		sinon.restore();
	});

	describe('Database key getter', () => {

		beforeEach(() => {
			sinon.stub(Settings, 'get');
		});

		it('Should return the default key if settings are not defined', () => {
			assert.strictEqual(modelClient.databaseKey, 'core');
		});

		it('Should return the default key if databaseKey setting is not defined', () => {

			Settings.get.returns({ foo: 'bar' });

			assert.strictEqual(modelClient.databaseKey, 'core');
		});

		it('Should return the key from the settings if it\'s present', () => {

			Settings.get.returns({ databaseKey: 'custom-key' });

			assert.strictEqual(modelClient.databaseKey, 'custom-key');
		});
	});

	describe('Table static getter', () => {

		beforeEach(() => {
			sinon.stub(Settings, 'get');
		});

		it('Should return the default table if settings are not defined', () => {
			assert.strictEqual(ModelClient.table, 'clients');
		});

		it('Should return the default table if table setting is not defined', () => {

			Settings.get.returns({ foo: 'bar' });

			assert.strictEqual(ModelClient.table, 'clients');
		});

		it('Should return the table from the settings if it\'s present', () => {

			Settings.get.returns({ table: 'custom-table' });

			assert.strictEqual(ModelClient.table, 'custom-table');
		});
	});

	describe('Identifier field static getter', () => {

		beforeEach(() => {
			sinon.stub(Settings, 'get');
		});

		it('Should return the default field if settings are not defined', () => {
			assert.strictEqual(ModelClient.identifierField, 'code');
		});

		it('Should return the default field if identifierField setting is not defined', () => {

			Settings.get.returns({ foo: 'bar' });

			assert.strictEqual(ModelClient.identifierField, 'code');
		});

		it('Should return the field from the settings if it\'s present', () => {

			Settings.get.returns({ identifierField: 'custom-field' });

			assert.strictEqual(ModelClient.identifierField, 'custom-field');
		});
	});

	describe('Fields static getter', () => {

		it('Should return the model available fields', () => {
			assert.deepStrictEqual(ModelClient.fields, {
				code: true
			});
		});
	});
});
