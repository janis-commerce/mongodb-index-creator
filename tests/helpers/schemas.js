'use strict';

const path = require('path');
const assert = require('assert');
const sandbox = require('sinon').createSandbox();

const Schemas = require('../../lib/helpers/schemas');

describe('Helpers', () => {

	describe('Schemas', () => {

		afterEach(() => {
			sandbox.restore();
		});

		describe('constructor', () => {

			it('Should use the default schemas path when no receives parameters', async () => {

				const schemas = new Schemas();
				assert.deepEqual(schemas.schemasPath, path.join(process.cwd(), 'schemas', 'mongo'));
			});

			it('Should use the specified schemas path when receives parameters', async () => {

				const schemas = new Schemas('some-path');
				assert.deepEqual(schemas.schemasPath, 'some-path');
			});
		});

		describe('Getters', () => {

			let requireStub;

			beforeEach(() => {
				requireStub = sandbox.stub(module.constructor, '_load');
			});

			const schemas = new Schemas();

			it('Should return the core schemas from schemas path', async () => {

				requireStub.returns({ core: {} });

				assert.deepStrictEqual(schemas.core, { core: {} });

				sandbox.assert.calledOnce(requireStub);
				sandbox.assert.calledWithMatch(requireStub, path.join(process.cwd(), 'schemas', 'mongo', 'core'));
			});

			it('Should return undefined when the core schemas file require fails', async () => {

				requireStub.throws();

				assert.deepStrictEqual(schemas.core, undefined);

				sandbox.assert.calledOnce(requireStub);
				sandbox.assert.calledWithMatch(requireStub, path.join(process.cwd(), 'schemas', 'mongo', 'core'));
			});

			it('Should return the clients schemas from schemas path', async () => {

				requireStub.returns({ myCollection: [] });

				assert.deepStrictEqual(schemas.client, { myCollection: [] });

				sandbox.assert.calledOnce(requireStub);
				sandbox.assert.calledWithMatch(requireStub, path.join(process.cwd(), 'schemas', 'mongo', 'clients'));
			});

			it('Should return undefined when the client schemas file require fails', async () => {

				requireStub.throws();

				assert.deepStrictEqual(schemas.client, undefined);

				sandbox.assert.calledOnce(requireStub);
				sandbox.assert.calledWithMatch(requireStub, path.join(process.cwd(), 'schemas', 'mongo', 'clients'));
			});
		});
	});
});
