# mongodb-index-creator

![Build Status](https://github.com/janis-commerce/mongodb-index-creator/workflows/Build%20Status/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/janis-commerce/mongodb-index-creator/badge.svg?branch=master)](https://coveralls.io/github/janis-commerce/mongodb-index-creator?branch=master)
[![npm version](https://badge.fury.io/js/%40janiscommerce%2Fmongodb-index-creator.svg)](https://www.npmjs.com/package/@janiscommerce/mongodb-index-creator)

A package to create MongoDB Indexes for databases collections

## Installation
```sh
npm install @janiscommerce/mongodb-index-creator
```
## :warning: Important Change
- Now if an error occurs either while deleting previous indexes or creating new ones, an Exception will be thrown aborting the index creation.
 
## Big Changes in _2.0.0_
- Now we use `@janiscommerce/model@^5.x.x` with all the new features of that magic package.
- Now the index are located in each Model and are obtained with the `indexes` static _getter_.
- Now it's possible to drop all the indexes removing the `indexes` static _getter_.

## Configuration
This package uses models for mantain indexes, creating or dropping if needs.

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

## Running the utility

Is possible to run the package using npx or as module using the API public methods.

### Usage without installation
```sh
npx @janiscommerce/mongodb-index-creator
```

### Usage (as module)
```js
const MongodbIndexCreator = require('@janiscommerce/mongodb-index-creator');
```

## API

### **`new mongodbIndexCreator()`**

Constructs the MongodbIndexCreator instance.

### **`async execute()`**

Run the utility for all models found in the models path.

### **`async executeForClientDatabases()`**

Run the utility for client models found in the models path.

### **`async executeForClientCode(clientCode)`**

Run the utility for client models found in the models path, but only for the client provided.

### **`async get serverlessFunction`**
Returns an array that contains the serverless function that can be use at the service `serverless.js` file.

## Examples

```js
const MongodbIndexCreator = require('@janiscommerce/mongodb-index-creator');

const mongodbIndexCreator = new MongodbIndexCreator();

(async () => {

	// execute for core and client databases
	await mongodbIndexCreator.execute();

	// execute for client databases
	await mongodbIndexCreator.executeForClientDatabases();

	// execute for specified client
	await mongodbIndexCreator.executeForClientCode('some-client');

})();
```

At a serverless.js file:
```js
'use strict';

const { helper } = require('sls-helper'); // eslint-disable-line
const { MongodbIndexCreator } =  require('@janiscommerce/mongodb-index-creator');

module.exports = helper({
	hooks: [
		// other hooks
		...MongodbIndexCreator.serverlessFunction
	]
});
```