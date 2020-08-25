'use strict';

const path = require('path');

const handlerPath = path.join(process.env.MS_PATH || '', 'lambda', 'MongoDBIndexCreator', 'index.handler');
const modelsPath = path.join(process.env.MS_PATH || '', 'models', '**');

module.exports = [[
	'function', {
		functionName: 'MongoDBIndexCreator',
		handler: handlerPath,
		description: 'MongoDB Indexes Creation Lambda',
		timeout: 60,
		package: { include: [modelsPath] }
	}
]];
