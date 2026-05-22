/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const streamChunksOfRawSource = require("./streamChunksOfRawSource");
const streamChunksOfSourceMap = require("./streamChunksOfSourceMap");

/** @typedef {import("../Source")} Source */
/** @typedef {import("./getGeneratedSourceInfo").GeneratedSourceInfo} GeneratedSourceInfo */
/** @typedef {(chunk: string | undefined, generatedLine: number, generatedColumn: number, sourceIndex: number, originalLine: number, originalColumn: number, nameIndex: number) => void} OnChunk */
/** @typedef {(sourceIndex: number, source: string | null, sourceContent: string | undefined) => void} OnSource */
/** @typedef {(nameIndex: number, name: string) => void} OnName */
/**
 * Optional per-source metadata propagated alongside the source map's
 * primary `sources` array. Today carries the spec-blessed `ignoreList`
 * flag (formerly `x_google_ignoreList`); future fields can be added
 * here without breaking the callback shape.
 *
 * Routed via `options.onSourceInfo` rather than as an extra parameter on
 * `onSource` so the hot 3-arg `onSource` call site keeps a monomorphic
 * inline-cache shape across the pipeline. Only sources that actually
 * carry per-source metadata pay the cost of the side-channel call.
 * @typedef {{ ignored?: boolean }} SourceInfo
 */
/** @typedef {(sourceIndex: number, info: SourceInfo) => void} OnSourceInfo */

/** @typedef {{ source?: boolean, finalSource?: boolean, columns?: boolean, onSourceInfo?: OnSourceInfo }} Options */

/**
 * @callback StreamChunksFunction
 * @param {Options} options options
 * @param {OnChunk} onChunk on chunk
 * @param {OnSource} onSource on source
 * @param {OnName} onName on name
 */

/** @typedef {Source & { streamChunks?: StreamChunksFunction }} SourceMaybeWithStreamChunksFunction */

/**
 * @param {SourceMaybeWithStreamChunksFunction} source source
 * @param {Options} options options
 * @param {OnChunk} onChunk on chunk
 * @param {OnSource} onSource on source
 * @param {OnName} onName on name
 * @returns {GeneratedSourceInfo} generated source info
 */
module.exports = (source, options, onChunk, onSource, onName) => {
	if (typeof source.streamChunks === "function") {
		return source.streamChunks(options, onChunk, onSource, onName);
	}
	const sourceAndMap = source.sourceAndMap(options);
	if (sourceAndMap.map) {
		return streamChunksOfSourceMap(
			/** @type {string} */
			(sourceAndMap.source),
			sourceAndMap.map,
			onChunk,
			onSource,
			onName,
			Boolean(options && options.finalSource),
			Boolean(options && options.columns !== false),
			options !== undefined && options !== null
				? options.onSourceInfo
				: undefined,
		);
	}
	return streamChunksOfRawSource(
		/** @type {string} */
		(sourceAndMap.source),
		onChunk,
		onSource,
		onName,
		Boolean(options && options.finalSource),
	);
};
