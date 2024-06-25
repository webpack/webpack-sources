/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const readOriginalScopes = require("./readOriginalScopes");

/**
 * @param {string[]} originalScopes the original scopes strings
 * @param {OnOriginalScope} onOriginalScope called for each original scope
 * @returns {void}
 */
const readAllOriginalScopes = (originalScopes, onOriginalScope) => {
	if (Array.isArray(originalScopes)) {
		let sourceIndex = 0;
		for (const originalScope of originalScopes) {
			readOriginalScopes(sourceIndex, originalScope, onOriginalScope);
			sourceIndex++;
		}
	}
};

module.exports = readAllOriginalScopes;
