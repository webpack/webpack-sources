/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const createMappingsSerializer = require("./createMappingsSerializer");

/** @typedef {import("../Source").RawSourceMap} RawSourceMap */
/** @typedef {import("../Source").SourceAndMap} SourceAndMap */
/** @typedef {import("./streamChunks").Options} Options */
/** @typedef {import("./streamChunks").StreamChunksFunction} StreamChunksFunction */

/** @typedef {{ streamChunks: StreamChunksFunction }} SourceLikeWithStreamChunks */

/**
 * Assign `value` at index `i` of `arr`, padding earlier slots with `null`
 * up to (but not including) `i`. Hoisted so both `getMap` and
 * `getSourceAndMap` share the same helper. We grow the backing store in
 * one step (`length = i + 1`) and then fill the gap, which is cheaper than
 * the previous `while (arr.length < i) arr.push(null)` loop when many
 * indices are skipped — both because `push` does the bounds check on each
 * iteration and because V8 has to reallocate as the array grows. Filling
 * with explicit `null` (instead of leaving holes) preserves the prior
 * dense-array shape that downstream consumers depend on.
 * @template T
 * @param {(T | null)[]} arr destination array
 * @param {number} i index to assign
 * @param {T} value value to assign
 * @returns {void}
 */
const setAtIndex = (arr, i, value) => {
	const oldLen = arr.length;
	if (i >= oldLen) {
		arr.length = i + 1;
		for (let k = oldLen; k < i; k++) arr[k] = null;
	}
	arr[i] = value;
};

/**
 * @param {SourceLikeWithStreamChunks} source source
 * @param {Options=} options options
 * @returns {RawSourceMap | null} map
 */
module.exports.getMap = (source, options) => {
	let mappings = "";
	/** @type {(string | null)[]} */
	const potentialSources = [];
	/** @type {(string | null)[]} */
	const potentialSourcesContent = [];
	/** @type {(string | null)[]} */
	const potentialNames = [];
	const addMapping = createMappingsSerializer(options);
	source.streamChunks(
		{ ...options, source: false, finalSource: true },
		(
			chunk,
			generatedLine,
			generatedColumn,
			sourceIndex,
			originalLine,
			originalColumn,
			nameIndex,
		) => {
			mappings += addMapping(
				generatedLine,
				generatedColumn,
				sourceIndex,
				originalLine,
				originalColumn,
				nameIndex,
			);
		},
		(sourceIndex, source, sourceContent) => {
			setAtIndex(potentialSources, sourceIndex, source);
			if (sourceContent !== undefined) {
				setAtIndex(potentialSourcesContent, sourceIndex, sourceContent);
			}
		},
		(nameIndex, name) => {
			setAtIndex(potentialNames, nameIndex, name);
		},
	);
	return mappings.length > 0
		? {
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
			}
		: null;
};

/**
 * @param {SourceLikeWithStreamChunks} inputSource input source
 * @param {Options=} options options
 * @returns {SourceAndMap} map
 */
module.exports.getSourceAndMap = (inputSource, options) => {
	let code = "";
	let mappings = "";
	/** @type {(string | null)[]} */
	const potentialSources = [];
	/** @type {(string | null)[]} */
	const potentialSourcesContent = [];
	/** @type {(string | null)[]} */
	const potentialNames = [];
	const addMapping = createMappingsSerializer(options);
	const { source } = inputSource.streamChunks(
		{ ...options, finalSource: true },
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
		},
		(sourceIndex, source, sourceContent) => {
			setAtIndex(potentialSources, sourceIndex, source);
			if (sourceContent !== undefined) {
				setAtIndex(potentialSourcesContent, sourceIndex, sourceContent);
			}
		},
		(nameIndex, name) => {
			setAtIndex(potentialNames, nameIndex, name);
		},
	);
	return {
		source: source !== undefined ? source : code,
		map:
			mappings.length > 0
				? {
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
					}
				: null,
	};
};
