/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { readTokens } = require("./vlq");

/** @typedef {import("../Source").OnOriginalScope} OnOriginalScope */

const HAS_NAME_FLAG = 1;

/**
 * @param {number} sourceIndex the source index
 * @param {string} originalScopes the original scopes string
 * @param {OnOriginalScope} onOriginalScope called for each original scope
 * @returns {void}
 */
const readOriginalScopes = (sourceIndex, originalScopes, onOriginalScope) => {
	if (typeof originalScopes !== "string") {
		return;
	}
	let currentDataPos = 0;
	let line = 1;
	let column = 0;
	let kind = -1;
	let flags = -1;
	let name = -1;
	let variables = [];
	readTokens(originalScopes, (control, value) => {
		if (control === 0) {
			switch (currentDataPos) {
				case 0: // line in the original code
					line += value;
					currentDataPos++;
					break;
				case 1: // column in the original code
					column = value;
					currentDataPos++;
					break;
				case 2: // kind
					kind = value;
					currentDataPos++;
					break;
				case 3: // flags
					flags = value;
					currentDataPos++;
					if ((flags & HAS_NAME_FLAG) === 0) {
						currentDataPos++;
					}
					break;
				case 4: // name
					name = value;
					currentDataPos++;
					break;
				case 5: // variables
					variables.push(value);
					break;
			}
		} else if (currentDataPos > 0) {
			onOriginalScope(sourceIndex, line, column, flags, kind, name, variables);
			currentDataPos = 0;
			column = 0;
			kind = -1;
			flags = -1;
			name = -1;
			variables.length = 0;
		}
	});
	if (currentDataPos > 0) {
		onOriginalScope(sourceIndex, line, column, flags, kind, name, variables);
	}
};

module.exports = readOriginalScopes;
module.exports.HAS_NAME_FLAG = HAS_NAME_FLAG;
