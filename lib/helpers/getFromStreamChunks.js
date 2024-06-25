/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const createGeneratedRangesSerializer = require("./createGeneratedRangesSerializer");
const createMappingsSerializer = require("./createMappingsSerializer");
const createOriginalScopesSerializer = require("./createOriginalScopesSerializer");

/** @typedef {import("../Source")} Source */

/**
 * @param {Source} inputSource input source
 * @param {object} options options
 * @returns {{source: string, map: object}} result
 */
exports.getSourceAndMap = (inputSource, options) => {
	let code = "";
	let mappings = "";
	let sources = [];
	let sourcesContent = [];
	let names = [];
	let originalScopes = [];
	let originalScopesSerializers = [];
	const addMapping = createMappingsSerializer(options);
	const { source } = inputSource.streamChunks(
		Object.assign({}, options, { finalSource: true }),
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
		},
		(nameIndex, name) => {
			while (names.length < nameIndex) {
				names.push(null);
			}
			names[nameIndex] = name;
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
		() => {
			throw new Error("onGeneratedRange is not supported yet");
		}
	);
	return {
		source: source !== undefined ? source : code,
		map:
			mappings.length > 0
				? {
						version: 3,
						file: "x",
						mappings,
						sources,
						sourcesContent:
							sourcesContent.length > 0 ? sourcesContent : undefined,
						names
				  }
				: null
	};
};

/**
 * @param {Source} source input source
 * @param {object} options options
 * @returns {object} SourceMap
 */
exports.getMap = (source, options) => {
	let mappings = "";
	let sources = [];
	let sourcesContent = [];
	let names = [];
	let originalScopes = [];
	let originalScopesSerializers = [];
	let generatedRanges = "";
	let generatedRangesSerializer = createGeneratedRangesSerializer();
	const addMapping = createMappingsSerializer(options);
	source.streamChunks(
		Object.assign({}, options, { source: false, finalSource: true }),
		(
			chunk,
			generatedLine,
			generatedColumn,
			sourceIndex,
			originalLine,
			originalColumn,
			nameIndex
		) => {
			mappings += addMapping(
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
		},
		(nameIndex, name) => {
			while (names.length < nameIndex) {
				names.push(null);
			}
			names[nameIndex] = name;
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
	const hasOriginalScopes = originalScopes.some(str => str !== "");
	if (
		mappings.length === 0 &&
		!hasOriginalScopes &&
		generatedRanges.length === 0
	)
		return null;
	let map = {
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
	return map;
};
