'use strict';

const { Lambda, Invoker } = require('@janiscommerce/lambda');

const ModelHelper = require('./model-helper');

module.exports = class MongoDBIndexCreator extends Lambda {

	async process() {

		const models = await ModelHelper.getModels();

		if(!models.length)
			return;

		await Invoker.serviceCall('devops', 'IndexCreatorDispatcher', {
			serviceCode: process.env.JANIS_SERVICE_NAME,
			models,
			...this.data?.clientCode && { clientCode: this.data.clientCode },
			...this.data?.deployData && { deployData: this.data.deployData }
		});
	}
};
