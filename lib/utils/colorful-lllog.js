'use strict';

const colorfulHandler = require('./colorful-lllog-handler');

module.exports = logLevel => require('lllog')(logLevel, colorfulHandler); // eslint-disable-line global-require
