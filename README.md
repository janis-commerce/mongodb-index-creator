# mongodb-index-creator

[![Build Status](https://travis-ci.org/janis-commerce/mongodb-index-creator.svg?branch=master)](https://travis-ci.org/janis-commerce/mongodb-index-creator)
[![Coverage Status](https://coveralls.io/repos/github/janis-commerce/mongodb-index-creator/badge.svg?branch=master)](https://coveralls.io/github/janis-commerce/mongodb-index-creator?branch=master)

A package to create MongoDB indexes for core and client databases

## Installation
```sh
npm install @janiscommerce/mongodb-index-creator
```

## Configuration
This package uses a configuration file located in `/path/to/root/{MS_PATH/config/.janiscommercerc.json` to get the core and client database connection config.  
If you need more information about how to set the database configs, please check the following docs: [@janiscommerce/model](https://www.npmjs.com/package/@janiscommerce/model)

## Usage (command line)
```sh
npx @janiscommerce/mongodb-index-creator
```

## Examples
This package will get the `core.js` and `clients.js` schemas from the directory `/path/to/root/schemas/mongo` and it will read the database settings
for core and client databases using the config file located in `/path/to/root/{MS_PATH}/config/.janiscommercerc.json`.

### Core schemas file example
```js
'use strict';

module.exports = {

	core: {
		'my-collection': [
			{
				name: 'my-indexes',
				key: { myIndex: 1 }
				unique: true
			}
		]
	},

	'some-databaseKey': {
		'some-collection': [
			{
				key: { someIndex: 1 }
			}
		]
	}
}
```

### Client schemas file example
```js
'use strict';

module.exports = {
	
	'my-collection': [
		{
			name: 'my-indexes',
			key: { myIndex: 1 }
			unique: true
		}
	],	

	'some-collection': [
		{
			key: { someIndex: 1 }
		}
	]
}
```

### Running the utility
```sh
npx @janiscommerce/mongodb-index-creator
```

## Usage (as module)
```js
const MongodbIndexCreator = require('@janiscommerce/mongodb-index-creator');
```

## API

### **`new mongodbIndexCreator(schemasPath)`**

Constructs the MongodbIndexCreator instance, configuring the `schemasPath [String]`.

### **`async createCoreIndexes(coreSchemas)`**

Creates the indexes for the specified databaseKeys and collections in the `coreSchemas [Object]`.

### **`async createClientIndexes(clientSchemas)`**

Obtains the clients list then creates the indexes for each client database using the `clientSchemas [Object]`.

### **`async execute(schemasPath)`**

Obtain the core and clients schemas files from the received `schemasPath [Object]`, if this parameter not exist, the default `schemasPath` will be used.

## Examples

```js
const MongodbIndexCreator = require('@janiscommerce/mongodb-index-creator');

const mongodbIndexCreator = new MongodbIndexCreator();

(async () => {

	await mongodbIndexCreator.createCoreIndexes(coreSchemas);

	await mongodbIndexCreator.createClientIndexes(clientSchemas);

	await mongodbIndexCreator.execute();

})();
```

## Errors

The errors are informed with a `MongoDbIndexCreatorError`.
This object has a code that can be useful for a correct error handling.
The codes are the following:

| Code | Description                                                     |
|------|-----------------------------------------------------------------|
| 1    | Invalid database type for received client or databaseKey config |
| 2    | MongoDB connection failed                                       |
| 3    | Failed to create core indexes                                   |
| 4    | Failed to create client indexes                                 |
| 5    | Invalid core schemas                                            |
| 6    | Invalid client schemas                                          |
| 7    | Invalid collections in client/core schemas                      |
| 8    | Invalid collection indexes in client/core schemas               |
| 9    | Model Client error                                              |