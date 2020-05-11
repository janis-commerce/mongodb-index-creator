'use strict';

const path = require('path');

const handlerPath = path.join(process.env.MS_PATH || '', 'lambda', 'MongoDBIndexCreator', 'index.handler');
const clientModelPath = path.join(process.env.MS_PATH || '', 'models', 'client.js');

module.exports = [
	'function', {
		functionName: 'MongoDBIndexCreator',
		handler: handlerPath,
		description: 'MongoDB Indexes Creation Lambda',
		timeout: 60,
		package: { include: ['schemas/mongo/**', clientModelPath] }
	}
];
