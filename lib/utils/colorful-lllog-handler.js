'use strict';

const chalk = require('chalk');

const util = require('util');

const formatItem = logItem => {
	return typeof logItem === 'string' ? logItem : util.inspect(logItem);
};

const printer = (level, bgColor, color, icon, ...logItems) => {
	console.log(chalk`{bg${bgColor} {${color.toLowerCase()}  ${icon}  ${level.toUpperCase()} }} ${logItems.map(logItem => formatItem(logItem)).join(', ')}`); // eslint-disable-line no-console, max-len
};

module.exports = {
	debug: printer.bind(null, 'debug', 'White', 'Black', '·'),
	info: printer.bind(null, 'info', 'Cyan', 'Black', '⚙'),
	warn: printer.bind(null, 'warn', 'Yellow', 'Black', '⚠'),
	error: printer.bind(null, 'error', 'Red', 'Black', '⨯'),
	fatal: printer.bind(null, 'fatal', 'Black', 'Red', '⨯')
};
