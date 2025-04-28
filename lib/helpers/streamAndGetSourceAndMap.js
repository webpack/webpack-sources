/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const createGeneratedRangesSerializer = require("./createGeneratedRangesSerializer");
const createMappingsSerializer = require("./createMappingsSerializer");
const createOriginalScopesSerializer = require("./createOriginalScopesSerializer");
const streamChunks = require("./streamChunks");

/** @typedef {import("../Source").OnOriginalScope} OnOriginalScope */
/** @typedef {import("../Source").OnGeneratedRange} OnGeneratedRange */

/**
 * @param {Source} inputSource input source
 * @param {object} options options
 * @param {function(string, number, number, number, number, number, number): void} onChunk called for each chunk of code
 * @param {function(number, string, string)} onSource called for each source
 * @param {function(number, string)} onName called for each name
 * @param {OnOriginalScope} onOriginalScope called for each original scope
 * @param {OnGeneratedRange} onGeneratedRange called for each generated range
 * @returns {void}
 */
const streamAndGetSourceAndMap = (
	inputSource,
	options,
	onChunk,
	onSource,
	onName,
	onOriginalScope,
	onGeneratedRange
) => {
	let code = "";
	let mappings = "";
	let sources = [];
	let sourcesContent = [];
	let names = [];
	let originalScopes = [];
	let originalScopesSerializers = [];
	let generatedRanges = "";
	let generatedRangesSerializer = createGeneratedRangesSerializer();
	const addMapping = createMappingsSerializer(
		Object.assign({}, options, { columns: true })
	);
	const finalSource = !!(options && options.finalSource);
	const { generatedLine, generatedColumn, source } = streamChunks(
		inputSource,
		options,
		(
			chunk,
			generatedLine,
			generatedColumn,
			sourceIndex,
			originalLine,
			originalColumn,
			nameIndex
		) => {
			if (chunk !== undefined) code += chunk;
			mappings += addMapping(
				generatedLine,
				generatedColumn,
				sourceIndex,
				originalLine,
				originalColumn,
				nameIndex
			);
			return onChunk(
				finalSource ? undefined : chunk,
				generatedLine,
				generatedColumn,
				sourceIndex,
				originalLine,
				originalColumn,
				nameIndex
			);
		},
		(sourceIndex, source, sourceContent) => {
			while (sources.length < sourceIndex) {
				sources.push(null);
			}
			sources[sourceIndex] = source;
			if (sourceContent !== undefined) {
				while (sourcesContent.length < sourceIndex) {
					sourcesContent.push(null);
				}
				sourcesContent[sourceIndex] = sourceContent;
			}
			while (originalScopes.length <= sourceIndex) {
				originalScopes.push("");
				originalScopesSerializers.push(createOriginalScopesSerializer());
			}
			return onSource(sourceIndex, source, sourceContent);
		},
		(nameIndex, name) => {
			while (names.length < nameIndex) {
				names.push(null);
			}
			names[nameIndex] = name;
			return onName(nameIndex, name);
		},
		(sourceIndex, line, column, flags, kind, name, variables) => {
			originalScopes[sourceIndex] += originalScopesSerializers[sourceIndex](
				line,
				column,
				flags,
				kind,
				name,
				variables
			);
		},
		(generatedLine, generatedColumn, flags, definition, callsite, bindings) => {
			generatedRanges += generatedRangesSerializer(
				generatedLine,
				generatedColumn,
				flags,
				definition,
				callsite,
				bindings
			);
		}
	);
	const resultSource = source !== undefined ? source : code;

	const hasOriginalScopes = originalScopes.some(str => str !== "");
	const map = {
		version: 3,
		file: "x",
		mappings,
		sources,
		sourcesContent: sourcesContent.length > 0 ? sourcesContent : undefined,
		names
	};
	if (hasOriginalScopes) {
		map.originalScopes = originalScopes;
	}
	if (generatedRanges.length > 0) {
		map.generatedRanges = generatedRanges;
	}
	return {
		result: {
			generatedLine,
			generatedColumn,
			source: finalSource ? resultSource : undefined
		},
		source: resultSource,
		map:
			mappings.length > 0 || hasOriginalScopes || generatedRanges.length > 0
				? map
				: null
	};
};

module.exports = streamAndGetSourceAndMap;
