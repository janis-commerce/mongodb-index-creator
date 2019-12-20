# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
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