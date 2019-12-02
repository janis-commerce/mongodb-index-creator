# mongodb-index-creator

[![Build Status](https://travis-ci.org/janis-commerce/mongodb-index-creator.svg?branch=master)](https://travis-ci.org/janis-commerce/mongodb-index-creator)
[![Coverage Status](https://coveralls.io/repos/github/janis-commerce/mongodb-index-creator/badge.svg?branch=master)](https://coveralls.io/github/janis-commerce/mongodb-index-creator?branch=master)

A package to create MongoDB indexes for core and client databases

## Installation
```sh
npm install @janiscommerce/mongodb-index-creator
```

## Configuration
This package uses a configuration file located in `/path/to/root/{MS_PATH}/config/.janiscommercerc.json` to get the core and client database connection config.  
If you need more information about how to set the database configs, please check the following docs: [@janiscommerce/model](https://www.npmjs.com/package/@janiscommerce/model)

## Usage (command line)

This package will get the schemas files from the source directory: `/path/to/root/schemas/mongo`, also will read the database settings
for core and client databases using the config file located in `/path/to/root/{MS_PATH}/config/.janiscommercerc.json`.

### Schemas files
In order to create the MongoDB indexes this utility will read schemas files content, if any of these files not exists will be ignored, but if exists shouldn't be empty, must have at least the required structure, otherwise the utility will throw an error.

The schemas path should contain the following files:

- `core.js`: This file contains the schemas for core databases (databaseKey models).
- `clients.js`: This file contains the schemas for client databases (session models).

#### Core schemas file
This file is an `[Object]` export with the following structure:
- databaseKey (required): A `[String]` with the database key for the database where the indexes will be created
	- collections (required): An `[Object array]` with each prefix properties that will be created
		- prefix (required): An `[Object]` with the prefix properties
			- name (optional): A `[String]` with the internal name of the MongoDB index
			- key (required): An `[Object]` with the field and the index type for that field, for an ascending index use `1` or `-1` for a descending index
			- unique (optional): `[Boolean]` Specify if the index will be unique

#### Clients schemas file
This file is an `[Object]` export with the following structure:
- collections (required): An `[Object array]` with each prefix properties that will be created
	- prefix (required): An `[Object]` with the prefix properties
		- name (optional): A `[String]` with the internal name of the MongoDB index
		- key (required): An `[Object]` with the field and the index type for that field, for an ascending index use `1` or `-1` for a descending index
		- unique (optional): `[Boolean]` Specify if the index will be unique

### Running the utility
```sh
npx @janiscommerce/mongodb-index-creator
```

## Examples

### Core schemas file example
```js
'use strict';

module.exports = {

	core: {
		'my-collection': [
			{
				name: 'my-indexes',
				key: { myIndex: 1 },
				unique: true
			}
		]
	},

	'other-database': {
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
			key: { myIndex: 1 },
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

### **`async execute(coreSchemas, clientSchemas)`**

Creates the indexes into the database using the received `coreSchemas [Object]` and `clientSchemas [Object]`, if both params not exists, will used the files located in the `schemasPath`.

## Examples

```js
const MongodbIndexCreator = require('@janiscommerce/mongodb-index-creator');

const mongodbIndexCreator = new MongodbIndexCreator();

(async () => {

	await mongodbIndexCreator.createCoreIndexes(coreSchemas);

	await mongodbIndexCreator.createClientIndexes(clientSchemas);

	// execute with core and client schemas from files
	await mongodbIndexCreator.execute();

	// execute with specified core and client schemas
	await mongodbIndexCreator.execute(coreSchemas, clientSchemas);

})();
```

## Notes
- **If the schemas files contains indexes for collections that not exists in the target database, these collections will be created by MongoDB during the index creation process.**

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