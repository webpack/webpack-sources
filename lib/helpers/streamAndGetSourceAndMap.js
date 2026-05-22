/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const createMappingsSerializer = require("./createMappingsSerializer");
const streamChunks = require("./streamChunks");

/** @typedef {import("../Source").RawSourceMap} RawSourceMap */
/** @typedef {import("./streamChunks").GeneratedSourceInfo} GeneratedSourceInfo */
/** @typedef {import("./streamChunks").OnChunk} OnChunk */
/** @typedef {import("./streamChunks").OnName} OnName */
/** @typedef {import("./streamChunks").OnSource} OnSource */
/** @typedef {import("./streamChunks").Options} Options */
/** @typedef {import("./streamChunks").SourceMaybeWithStreamChunksFunction} SourceMaybeWithStreamChunksFunction */

/**
 * @param {SourceMaybeWithStreamChunksFunction} inputSource input source
 * @param {Options} options options
 * @param {OnChunk} onChunk on chunk
 * @param {OnSource} onSource on source
 * @param {OnName} onName on name
 * @returns {{ result: GeneratedSourceInfo, source: string, map: RawSourceMap | null }} result
 */
const streamAndGetSourceAndMap = (
	inputSource,
	options,
	onChunk,
	onSource,
	onName,
) => {
	let code = "";
	let mappings = "";
	/** @type {(string | null)[]} */
	const potentialSources = [];
	/** @type {(string | null)[]} */
	const potentialSourcesContent = [];
	/** @type {(string | null)[]} */
	const potentialNames = [];
	/**
	 * Record sources flagged as `ignoreList` upstream so the cached map
	 * preserves them. Without this, the second (cached) read would drop
	 * the field, since the cache replays a stripped-down map.
	 * @type {undefined | Set<number>}
	 */
	let ignoredSources;
	const outerOnSourceInfo =
		options !== undefined && options !== null
			? options.onSourceInfo
			: undefined;
	const addMapping = createMappingsSerializer({ ...options, columns: true });
	const finalSource = Boolean(options && options.finalSource);
	const { generatedLine, generatedColumn, source } = streamChunks(
		inputSource,
		{
			...options,
			onSourceInfo: (sourceIndex, info) => {
				if (info.ignored) {
					if (ignoredSources === undefined) ignoredSources = new Set();
					ignoredSources.add(sourceIndex);
				}
				if (outerOnSourceInfo !== undefined) {
					outerOnSourceInfo(sourceIndex, info);
				}
			},
		},
		(
			chunk,
			generatedLine,
			generatedColumn,
			sourceIndex,
			originalLine,
			originalColumn,
			nameIndex,
		) => {
			if (chunk !== undefined) code += chunk;
			mappings += addMapping(
				generatedLine,
				generatedColumn,
				sourceIndex,
				originalLine,
				originalColumn,
				nameIndex,
			);
			return onChunk(
				finalSource ? undefined : chunk,
				generatedLine,
				generatedColumn,
				sourceIndex,
				originalLine,
				originalColumn,
				nameIndex,
			);
		},
		(sourceIndex, source, sourceContent) => {
			while (potentialSources.length < sourceIndex) {
				potentialSources.push(null);
			}
			potentialSources[sourceIndex] = source;
			if (sourceContent !== undefined) {
				while (potentialSourcesContent.length < sourceIndex) {
					potentialSourcesContent.push(null);
				}
				potentialSourcesContent[sourceIndex] = sourceContent;
			}
			return onSource(sourceIndex, source, sourceContent);
		},
		(nameIndex, name) => {
			while (potentialNames.length < nameIndex) {
				potentialNames.push(null);
			}
			potentialNames[nameIndex] = name;
			return onName(nameIndex, name);
		},
	);
	const resultSource = source !== undefined ? source : code;

	/** @type {RawSourceMap | null} */
	let map = null;
	if (mappings.length > 0) {
		map = {
			version: 3,
			file: "x",
			mappings,
			// We handle broken sources as `null`, in spec this field should be string, but no information what we should do in such cases if we change type it will be breaking change
			sources: /** @type {string[]} */ (potentialSources),
			sourcesContent:
				potentialSourcesContent.length > 0
					? /** @type {string[]} */ (potentialSourcesContent)
					: undefined,
			names: /** @type {string[]} */ (potentialNames),
		};
		if (ignoredSources !== undefined) {
			map.ignoreList = [...ignoredSources].sort((a, b) => a - b);
		}
	}
	return {
		result: {
			generatedLine,
			generatedColumn,
			source: finalSource ? resultSource : undefined,
		},
		source: resultSource,
		map,
	};
};

module.exports = streamAndGetSourceAndMap;
