/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { readTokens } = require("./vlq");

/** @typedef {import("../Source").OnOriginalScope} OnOriginalScope */

const HAS_NAME_FLAG = 1;

/**
 * Decode the `originalScopes` string for a single source from the Source Map
 * Scopes Proposal and emit each scope boundary via `onOriginalScope`.
 *
 * `onOriginalScope` is called with `flags >= 0` for the start of a scope and
 * `flags === -1` for the end of a scope.
 * @param {number} sourceIndex the source index
 * @param {string} originalScopes the original scopes string
 * @param {OnOriginalScope} onOriginalScope called for each original scope
 * @returns {void}
 */
const readOriginalScopes = (sourceIndex, originalScopes, onOriginalScope) => {
	if (typeof originalScopes !== "string") return;
	let currentDataPos = 0;
	let line = 1;
	let column = 0;
	let kind = -1;
	let flags = -1;
	let name = -1;
	/** @type {number[]} */
	const variables = [];
	readTokens(originalScopes, (control, value) => {
		if (control === 0) {
			switch (currentDataPos) {
				case 0:
					line += value;
					currentDataPos++;
					break;
				case 1:
					column = value;
					currentDataPos++;
					break;
				case 2:
					kind = value;
					currentDataPos++;
					break;
				case 3:
					flags = value;
					currentDataPos++;
					if ((flags & HAS_NAME_FLAG) === 0) {
						currentDataPos++;
					}
					break;
				case 4:
					name = value;
					currentDataPos++;
					break;
				case 5:
					variables.push(value);
					break;
				default:
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
