'use strict';

const { Lambda, Invoker } = require('@janiscommerce/lambda');

const { struct } = require('@janiscommerce/superstruct');

const ModelHelper = require('./model-helper');

module.exports = class MongoDBIndexCreator extends Lambda {

	get struct() {
		return struct.optional({
			clientCode: struct.union(['string?', 'array?'])
		});
	}

	async process() {

		const models = await ModelHelper.getModels();

		if(!models.length)
			return;

		await Invoker.serviceCall('devops', 'IndexCreatorDispatcher', {
			serviceCode: process.env.JANIS_SERVICE_NAME,
			models,
			...this.data?.clientCode && { clientCode: this.data.clientCode }
		});
	}
};
