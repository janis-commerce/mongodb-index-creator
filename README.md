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

## Errors

The errors are informed with a `MongoDbIndexCreatorError`.
This object has a code that can be useful for a correct error handling.
The codes are the following:

| Code | Description                    |
|------|--------------------------------|
| 1    | Core database config not found in config file       |
| 2    | Client database config not found in config file     |
| 3    | Invalid client database config in file              |
| 4    | A databaseKey from schemas not found in config file |
| 5    | MongoDB connection failed                           |
| 6    | Failed to create core indexes                       |
| 7    | Failed to create client indexes                     |
| 8    | Invalid core schemas                                |
| 9    | Invalid client schemas                              |
| 10   | Invalid parameters for create indexes               |
| 11   | Invalid collection name for create indexes          |
| 12   | Invalid received indexes to create                  |
| 13   | Invalid index to create                             |
| 14   | Client Model fails to get clients                   |

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
