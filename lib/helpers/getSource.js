/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const getSource = (sourceMap, index) => {
	const { sourceRoot, sources } = sourceMap;
	const source = sources[index];
	if (!sourceRoot) return source;
	if (sourceRoot.endsWith("/")) return sourceRoot + source;
	return sourceRoot + "/" + source;
};

module.exports = getSource;
