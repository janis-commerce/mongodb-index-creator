'use strict';

module.exports = model => {

	const operation = model.useReadDB ? 'read' : 'write';

	let title = `${model.databaseKey}.${operation}.${model.constructor.table}`;

	if(model.clientCode)
		title = `${model.clientCode}.${title}`;

	return title;
};
