/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const streamChunksOfSourceMap = require("./streamChunksOfSourceMap");

module.exports = (source, options, onChunk, onSource, onName) => {
	if (typeof source.streamChunks === "function") {
		return source.streamChunks(options, onChunk, onSource, onName);
	} else {
		const sourceAndMap = source.sourceAndMap(options);
		return streamChunksOfSourceMap(
			sourceAndMap.source,
			sourceAndMap.map,
			onChunk,
			onSource,
			onName
		);
	}
};
