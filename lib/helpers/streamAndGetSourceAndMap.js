/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const createMappingsSerializer = require("./createMappingsSerializer");
const {
	createGeneratedRangesSerializer,
	createOriginalScopesSerializer,
} = require("./scopes");
const streamChunks = require("./streamChunks");

/** @typedef {import("../Source").OnGeneratedRange} OnGeneratedRange */
/** @typedef {import("../Source").OnOriginalScope} OnOriginalScope */
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
 * @param {OnOriginalScope=} onOriginalScope on original scope (Scopes Proposal)
 * @param {OnGeneratedRange=} onGeneratedRange on generated range (Scopes Proposal)
 * @returns {{ result: GeneratedSourceInfo, source: string, map: RawSourceMap | null }} result
 */
const streamAndGetSourceAndMap = (
	inputSource,
	options,
	onChunk,
	onSource,
	onName,
	onOriginalScope,
	onGeneratedRange,
) => {
	let code = "";
	let mappings = "";
	/** @type {(string | null)[]} */
	const potentialSources = [];
	/** @type {(string | null)[]} */
	const potentialSourcesContent = [];
	/** @type {(string | null)[]} */
	const potentialNames = [];
	/** @type {string[]} */
	const originalScopes = [];
	/** @type {((line: number, column: number, flags: number, kind: number, name: number, variables: number[] | undefined) => string)[]} */
	const originalScopesSerializers = [];
	let generatedRanges = "";
	const generatedRangesSerializer = createGeneratedRangesSerializer();
	const addMapping = createMappingsSerializer({ ...options, columns: true });
	const finalSource = Boolean(options && options.finalSource);
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
			while (originalScopes.length <= sourceIndex) {
				originalScopes.push("");
				originalScopesSerializers.push(createOriginalScopesSerializer());
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
		(sourceIndex, line, column, flags, kind, name, variables) => {
			while (originalScopes.length <= sourceIndex) {
				originalScopes.push("");
				originalScopesSerializers.push(createOriginalScopesSerializer());
			}
			originalScopes[sourceIndex] += originalScopesSerializers[sourceIndex](
				line,
				column,
				flags,
				kind,
				name,
				variables,
			);
			if (onOriginalScope) {
				onOriginalScope(
					sourceIndex,
					line,
					column,
					flags,
					kind,
					name,
					variables,
				);
			}
		},
		(generatedLine, generatedColumn, flags, definition, callsite, bindings) => {
			generatedRanges += generatedRangesSerializer(
				generatedLine,
				generatedColumn,
				flags,
				definition,
				callsite,
				bindings,
			);
			if (onGeneratedRange) {
				onGeneratedRange(
					generatedLine,
					generatedColumn,
					flags,
					definition,
					callsite,
					bindings,
				);
			}
		},
	);
	const resultSource = source !== undefined ? source : code;
	const hasOriginalScopes = originalScopes.some((str) => str !== "");
	const hasScopesData = hasOriginalScopes || generatedRanges.length > 0;

	let map = null;
	if (mappings.length > 0 || hasScopesData) {
		/** @type {RawSourceMap} */
		const m = {
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
		if (hasOriginalScopes) m.originalScopes = originalScopes;
		if (generatedRanges.length > 0) m.generatedRanges = generatedRanges;
		map = m;
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
