/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const streamChunksOfSourceMap = require("./streamChunksOfSourceMap");

module.exports = (source, options, onChunk, onSource, onName) => {
	if (typeof source.streamChunks === "function") {
		return source.streamChunks(options, onChunk, onSource, onName);
	} else if (options && options.source === false) {
		const map = source.map(options);
		return streamChunksOfSourceMap(
			undefined,
			map,
			onChunk,
			onSource,
			onName,
			true
		);
	} else {
		const sourceAndMap = source.sourceAndMap(options);
		return streamChunksOfSourceMap(
			sourceAndMap.source,
			sourceAndMap.map,
			onChunk,
			onSource,
			onName,
			!!(options && options.finalSource)
		);
	}
};
