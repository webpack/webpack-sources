/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const streamChunksOfRawSource = require("./streamChunksOfRawSource");
const streamChunksOfSourceMap = require("./streamChunksOfSourceMap");

/** @typedef {import("../Source").OnOriginalScope} OnOriginalScope */
/** @typedef {import("../Source").OnGeneratedRange} OnGeneratedRange */

/**
 * @param {Source} source the source
 * @param {object} options options
 * @param {function(string, number, number, number, number, number, number): void} onChunk called for each chunk of code
 * @param {function(number, string, string)} onSource called for each source
 * @param {function(number, string)} onName called for each name
 * @param {OnOriginalScope} onOriginalScope called for each original scope
 * @param {OnGeneratedRange} onGeneratedRange called for each generated range
 * @returns {{ generatedLine: number, generatedColumn: number }} final generated position
 */
module.exports = (
	source,
	options,
	onChunk,
	onSource,
	onName,
	onOriginalScope,
	onGeneratedRange
) => {
	if (typeof source.streamChunks === "function") {
		return source.streamChunks(
			options,
			onChunk,
			onSource,
			onName,
			onOriginalScope,
			onGeneratedRange
		);
	} else {
		const sourceAndMap = source.sourceAndMap(options);
		if (sourceAndMap.map) {
			return streamChunksOfSourceMap(
				sourceAndMap.source,
				sourceAndMap.map,
				onChunk,
				onSource,
				onName,
				onOriginalScope,
				onGeneratedRange,
				!!(options && options.finalSource),
				!!(options && options.columns !== false)
			);
		} else {
			return streamChunksOfRawSource(
				sourceAndMap.source,
				onChunk,
				onSource,
				onName,
				onOriginalScope,
				onGeneratedRange,
				!!(options && options.finalSource)
			);
		}
	}
};
