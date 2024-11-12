'use strict';

const fs = require('fs');
const path = require('path');

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

				// eslint-disable-next-line global-require, import/no-dynamic-require
				const ModelClass = require(path.join(this.path, modelFile));

				const model = new ModelClass();

				if(await model.isCore())
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
