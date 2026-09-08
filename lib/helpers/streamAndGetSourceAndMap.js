/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { createMappingsWriter } = require("./createMappingsSerializer");
const streamChunks = require("./streamChunks");

/** @typedef {import("../Source").RawSourceMap} RawSourceMap */
/** @typedef {import("./streamChunks").GeneratedSourceInfo} GeneratedSourceInfo */
/** @typedef {import("./streamChunks").OnChunk} OnChunk */
/** @typedef {import("./streamChunks").OnName} OnName */
/** @typedef {import("./streamChunks").OnSource} OnSource */
/** @typedef {import("./streamChunks").Options} Options */
/** @typedef {import("./streamChunks").SourceMaybeWithStreamChunksFunction} SourceMaybeWithStreamChunksFunction */

/** @type {typeof import("./scopes") | undefined} */
let scopesHelpers;

/**
 * Loads the scopes helpers on first use. They are only reachable through the
 * `scopes` option, so requiring them eagerly would put the encoder in the
 * module graph of every caller that never asks for the field.
 * @returns {ReturnType<typeof import("./scopes").createScopesWriter>} writer
 */
const createScopesWriter = () => {
	if (scopesHelpers === undefined) scopesHelpers = require("./scopes");
	return scopesHelpers.createScopesWriter();
};

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
	/** @type {(string | null)[]} */
	const potentialSources = [];
	/** @type {(string | null)[]} */
	const potentialSourcesContent = [];
	/** @type {(string | null)[]} */
	const potentialNames = [];
	const mappingsWriter = createMappingsWriter({ ...options, columns: true });
	const addMapping = mappingsWriter.add;
	const scopesWriter =
		options && options.scopes ? createScopesWriter() : undefined;
	const finalSource = Boolean(options && options.finalSource);
	// The caller may have passed `source: false` (getMap does), but this
	// helper caches the source text, so the inner stream must produce it.
	const innerOptions =
		options && options.source === false
			? { ...options, source: true }
			: options;
	const { generatedLine, generatedColumn, source } = streamChunks(
		inputSource,
		innerOptions,
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
			addMapping(
				generatedLine,
				generatedColumn,
				sourceIndex,
				originalLine,
				originalColumn,
				nameIndex,
			);
			if (scopesWriter !== undefined) {
				scopesWriter.add(
					generatedLine,
					generatedColumn,
					sourceIndex,
					originalLine,
				);
			}
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
		(sourceIndex, source, sourceContent, scopeBindings) => {
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
			if (scopesWriter !== undefined) {
				scopesWriter.addSource(sourceIndex, scopeBindings);
			}
			return onSource(sourceIndex, source, sourceContent, scopeBindings);
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
	const mappings = mappingsWriter.finish();
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
		if (scopesWriter !== undefined) {
			scopesWriter.finish(map, generatedLine || 0);
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
