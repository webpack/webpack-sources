/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { valueAsToken } = require("./vlq");

const createOriginalScopesSerializer = () => {
	let initial = true;
	let currentLine = 1;
	return (line, column, flags, kind, name, variables) => {
		let str = initial ? "" : ",";
		str += valueAsToken(line - currentLine);
		currentLine = line;
		str += valueAsToken(column);
		if (flags >= 0) {
			str += valueAsToken(kind);
			str += valueAsToken(flags);
			if (name >= 0) str += valueAsToken(name);
			if (variables) {
				for (const variable of variables) {
					str += valueAsToken(variable);
				}
			}
		}
		initial = false;
		return str;
	};
};

module.exports = createOriginalScopesSerializer;
