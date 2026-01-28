'use strict';

const path = require('path');

/* istanbul ignore next */
const handlerPath = path.join(process.env.MS_PATH || '', 'lambda', 'MongoDBIndexCreator', 'index.handler');
/* istanbul ignore next */
const modelsPath = path.join(process.env.MS_PATH || '', 'models', '**');

module.exports = [[
	'function', {
		functionName: 'MongoDBIndexCreator',
		handler: handlerPath,
		description: 'MongoDB Index Creator - Invoke IndexCreatorDispatcher function from DevOps service',
		timeout: 300,
		package: { include: [modelsPath] }
	}
]];
