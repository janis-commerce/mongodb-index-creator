# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Error throwing in create and drop indexes methods
## [2.3.3] - 2021-06-04
### Changed
- `dropIndex` and `createIndex` are called individually to avoid complete failures when not necessary

## [2.3.2] - 2021-06-04
### Fixed
- Fixed `unique: false` and `sparse: false` in model definition scenarios

## [2.3.1] - 2021-06-04
### Fixed
- Removed `read` database indexes operations

## [2.3.0] - 2021-02-08
### Added
- Detect the index has changed when change the properties `key`, `unique`, `expireAfterSeconds`, `partialFilterExpression`, `sparse`
- Drop and create the indexes separately to avoid operation collisions 
- Optimized code using the last version of @janiscommerce/api-session with 'offline' client injection
- Index struct validation errors will be shown in output 

## [2.2.3] - 2020-09-03
### Changed
- Better validation for client databases

## [2.2.2] - 2020-09-01
### Changed
- Better summary and loggers
- Simplified tests

## [2.2.1] - 2020-08-31
### Added
- Validation when `dropIndexes()` is called

### Changed
- Better summary and loggers

## [2.2.0] - 2020-08-31
### Added
- Validation when `createIndexes()` is called

## [2.1.2] - 2020-08-27
### Changed
- Updated `@janiscommerce/api-session` to `3.x.x`

## [2.1.1] - 2020-08-26
### Fixed
- Fix error message when invalid index

## [2.1.0] - 2020-08-26
### Changed
- Improved results
- Better loggers

## [2.0.1] - 2020-08-26
### Fixed
- Added ApiSession for client models

## [2.0.0] - 2020-08-26
### Changed
- Upgraded `@janiscommerce/model` dependency to `^5.0.0`
- Using models `indexes` getter instead of schema files
- Improved `Results` that now gives more detailed summary
- Big refactor to simplify tests and usability

### Removed
- Schemas from files `core.js` and `client.js`
- `package-lock.json`

## [1.2.1] - 2020-05-12
### Fixed
- Serverless function - Added client model in `package.include`

## [1.2.0] - 2020-05-08
### Added
- Serverless function getter
- TTL indexes support

## [1.1.3] - 2020-02-26
### Fixed
- Unexisting target DBs or collections crashes the execution

## [1.1.2] - 2020-01-16
### Changed
- Splitted internal methods into helper modules

### Fixed
- MongoDB driver compatibility by using a Model instance

## [1.1.1] - 2019-12-20
### Fixed
- MongoDB default index `_id_` is now ignored when getting current indexes from database

## [1.1.0] - 2019-12-12
### Added
- `executeForClientCode` method for creating indexes for the specified client databases
- Automatically creates, skip and drop the indexes on target DB by comparing it with schemas files
- `executeForCoreDatabases` and `executeForClientDatabases` methods

## [1.0.0] - 2019-12-10
### Added
- `mongodb-index-creator` package
- documentation
- unit tests