'use strict';

const mockRequire = require('mock-require');
const path = require('path');
const fs = require('fs');

const ModelHelper = require('../../lib/model-helper');

module.exports = (sinon, models) => {

	sinon.stub(fs, 'readdirSync')
		.returns(Object.keys(models));

	Object.entries(models).forEach(([file, ModelClass]) => {
		mockRequire(path.join(ModelHelper.path, file), ModelClass);
	});
};
