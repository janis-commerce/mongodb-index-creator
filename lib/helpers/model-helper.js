'use strict';

const fs = require('fs');
const path = require('path');

const Model = require('@janiscommerce/model');

const logger = require('lllog')();

module.exports = class ModelHelper {

	static get path() {
		/* istanbul ignore next */
		return path.join(process.cwd(), (process.env.MS_PATH || ''), 'models');
	}

	static async getModels() {

		const modelFiles = this.findModels();

		const coreModels = [];
		const clientModels = [];

		await Promise.all(
			modelFiles.map(async modelFile => {

				const modelPath = path.join(this.path, modelFile);

				// eslint-disable-next-line global-require, import/no-dynamic-require
				const ModelClass = require(path.join(modelPath));

				const model = new ModelClass();

				if(!(model instanceof Model))
					logger.warn(`Invalid model found in ${modelPath}, validate inheritance`);
				else if(await model.isCore())
					coreModels.push(ModelClass);
				else
					clientModels.push(ModelClass);
			})
		);

		return { coreModels, clientModels };
	}

	static findModels() {

		try {
			return fs.readdirSync(this.path);
		} catch(error) {
			logger.warn('Operation skipped: No models found.');
			return [];
		}
	}
};
