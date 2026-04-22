/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const readOriginalScopes = require("./readOriginalScopes");

/** @typedef {import("../Source").OnOriginalScope} OnOriginalScope */

/**
 * Decode an array of per-source `originalScopes` strings and emit each scope
 * via `onOriginalScope`. Non-array values are ignored.
 * @param {string[] | undefined} originalScopes the original scopes strings
 * @param {OnOriginalScope} onOriginalScope called for each original scope
 * @returns {void}
 */
const readAllOriginalScopes = (originalScopes, onOriginalScope) => {
	if (!Array.isArray(originalScopes)) return;
	for (
		let sourceIndex = 0;
		sourceIndex < originalScopes.length;
		sourceIndex++
	) {
		readOriginalScopes(
			sourceIndex,
			originalScopes[sourceIndex],
			onOriginalScope,
		);
	}
};

module.exports = readAllOriginalScopes;
