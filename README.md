# mongodb-index-creator

![Build Status](https://github.com/janis-commerce/mongodb-index-creator/workflows/Build%20Status/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/janis-commerce/mongodb-index-creator/badge.svg?branch=master)](https://coveralls.io/github/janis-commerce/mongodb-index-creator?branch=master)
[![npm version](https://badge.fury.io/js/%40janiscommerce%2Fmongodb-index-creator.svg)](https://www.npmjs.com/package/@janiscommerce/mongodb-index-creator)

A package to create MongoDB Indexes for databases collections

## :inbox_tray: Installation
```sh
npm install @janiscommerce/mongodb-index-creator
```

## :warning: Breaking Change since `3.0.0`
The package exports **MongoDBIndexCreator** class to be handled with [@janiscommerce/lambda](https://www.npmjs.com/package/@janiscommerce/lambda).

See **Configuration** section below.

## :hammer_and_wrench: Configuration

### Lambda function

<details>
	<summary>Adding the lambda function at <tt>src/lambda/MongoDBIndexCreator/index.js</tt></summary>

```js
'use strict';

const { Handler } = require('@janiscommerce/lambda');

const { MongoDBIndexCreator } = require('@janiscommerce/mongodb-index-creator');

module.exports.handler = (...args) => Handler.handle(MongoDBIndexCreator, ...args);

```
</details>

### Lambda function hook

<details>
	<summary>Register the lambda function at <tt>serverless.js</tt> file</summary>

```js
'use strict';

const { helper } = require('sls-helper'); // eslint-disable-line
const { serverlessFunction } =  require('@janiscommerce/mongodb-index-creator');

module.exports = helper({
	hooks: [
		// other hooks
		...serverlessFunction
	]
});

```
</details>

### Lambda function tests

<details>
	<summary>Add tests for the function added <tt>tests/lambda/MongoDBIndexCreator/index.js</tt></summary>

```js
'use strict';

const sinon = require('sinon');

const { Handler } = require('@janiscommerce/lambda');

const { MongoDBIndexCreator } = require('@janiscommerce/mongodb-index-creator');

const { handler: FunctionHandler } = require('../../../src/lambda/MongoDBIndexCreator');

describe('MongoDBIndexCreator', () => {

	beforeEach(() => sinon.stub(Handler, 'handle').resolves());

	afterEach(() => sinon.restore());

	it('Should handle with lambda handler when no payload was received', async () => {

		await FunctionHandler();

		sinon.assert.calledOnceWithExactly(Handler.handle, MongoDBIndexCreator);
	});

	it('Should handle with lambda handler when a client was received in payload', async () => {

		await FunctionHandler({ clientCode: 'my-client' });

		sinon.assert.calledOnceWithExactly(Handler.handle, MongoDBIndexCreator, { clientCode: 'my-client' });
	});

	it('Should handle with lambda handler when multiple client was received in payload', async () => {

		await FunctionHandler({ clientCode: ['my-client', 'other-client'] });

		sinon.assert.calledOnceWithExactly(Handler.handle, MongoDBIndexCreator, { clientCode: ['my-client', 'other-client'] });
	});
});

```
</details>

## Indexes configuration
This package uses models for maintain indexes, creating or dropping if needs.

If you need more information about how to configure a model, please check the following docs: [@janiscommerce/model](https://www.npmjs.com/package/@janiscommerce/model)

### Model
In every model we need to add a static `indexes` _getter_ to provide the indexes for that model (that will apply for the collection associated to the model).

```js

'use strict';

const Model = require('@janiscommerce/model');

module.exports = class Pet extends Model {

	static get table() {
		return 'pets';
	}

	static get indexes() {
		return [{
			name: 'code',
			key: { code: 1 },
			unique: true
		}];
	}
};

```

### Index Struct
Each Index object in the `indexes` _getter_ will be validated according the following struct

```yaml
name: 'string'
key: 'object'
unique: 'boolean?' # optional
sparse: 'boolean?' # optional
expireAfterSeconds: 'number?' # optional
partialFilterExpression: 'object?' # optional
```

For more information see [MongoDB Indexes](https://docs.mongodb.com/manual/indexes/)

## Examples

```js
const { Invoker } = require('@janiscommerce/lambda');

(async () => {

	// execute for core and all clients databases
	await Invoker.call('MongoDBIndexCreator');

	// execute for specified client
	await Invoker.call('MongoDBIndexCreator', { clientCode: 'some-client' });

	// execute for multiple clients
	await Invoker.call('MongoDBIndexCreator', { clientCode: ['some-client', 'other-client'] });

})();
```