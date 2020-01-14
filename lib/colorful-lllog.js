'use strict';

const util = require('util');

/* istanbul ignore next */
const formatItem = logItem => {
	return typeof logItem === 'string' ? logItem : util.inspect(logItem);
};

/* istanbul ignore next */
const printer = (level, bgColor, color, icon, ...logItems) => {
	console.log(`${bgColor}${color} ${icon}  ${level.toUpperCase().padEnd(5)} \u001b[0m ${logItems.map(logItem => formatItem(logItem)).join(', ')}`); // eslint-disable-line no-console, max-len
};

const colorfulHandler = {
	debug: printer.bind(null, 'debug', '\u001b[47m', '\u001b[30m', '·'),
	info: printer.bind(null, 'info', '\u001b[46m', '\u001b[30m', '⚙'),
	warn: printer.bind(null, 'warn', '\u001b[43m', '\u001b[30m', '⚠'),
	error: printer.bind(null, 'error', '\u001b[41m', '\u001b[30m', '⨯'),
	fatal: printer.bind(null, 'fatal', '\u001b[40m', '\u001b[31m', '⨯')
};

module.exports = logLevel => require('lllog')(logLevel, colorfulHandler); // eslint-disable-line global-require
