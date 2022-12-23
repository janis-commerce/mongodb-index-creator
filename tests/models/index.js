'use strict';

const ClientModel = require('./client/client');
const SimpleClientModel = require('./client/simple');
const CompleteClientModel = require('./client/complete');
const EmptyClientModel = require('./client/empty');

const SimpleCoreModel = require('./core/simple');
const EmptyCoreModel = require('./core/empty');
const invalidIndexesModelGenerator = require('./core/invalid-indexes');

const mockModel = require('./mock-model');

module.exports = {
	mockModel,
	ClientModel,
	SimpleClientModel,
	CompleteClientModel,
	EmptyClientModel,
	SimpleCoreModel,
	EmptyCoreModel,
	invalidIndexesModelGenerator
};
