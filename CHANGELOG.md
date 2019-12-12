# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- `executeForClientCode` method for creating indexes for the specified client databases
- Automatically creates, skip and drop the indexes on target DB by comparing it with schemas files

### Changed
- `execute` method splitted into `executeForCoreDatabases` and `executeForClientDatabases`

## [1.0.0] - 2019-12-10
### Added
- `mongodb-index-creator` package
- documentation
- unit tests