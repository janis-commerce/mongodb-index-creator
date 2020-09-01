'use strict';

const mockRequire = require('mock-require');
const path = require('path');
const fs = require('fs');

const { Models } = require('../../lib/helpers');

module.exports = (sandbox, models) => {

	sandbox.stub(fs, 'readdirSync')
		.returns(Object.keys(models));

	Object.entries(models).forEach(([file, ModelClass]) => {
		mockRequire(path.join(Models.path, file), ModelClass);
	});
};
