'use strict';

const SimpleClientModel = require('./client/simple');
const CompleteClientModel = require('./client/complete');
const EmptyClientModel = require('./client/empty');

const ClientModel = require('./core/client');
const SimpleCoreModel = require('./core/simple');
const EmptyCoreModel = require('./core/empty');
const invalidIndexesModelGenerator = require('./core/invalid-indexes');

const mockModel = require('./mock-model');

module.exports = {
	mockModel,
	SimpleClientModel,
	CompleteClientModel,
	EmptyClientModel,
	ClientModel,
	SimpleCoreModel,
	EmptyCoreModel,
	invalidIndexesModelGenerator
};
