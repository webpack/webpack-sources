/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const getGeneratedSourceInfo = require("./getGeneratedSourceInfo");
const getSource = require("./getSource");
const readMappings = require("./readMappings");

const SPLIT_LINES_REGEX = /[^\n]+\n?|\n/g;

const streamChunksOfSourceMapFull = (
	source,
	sourceMap,
	onChunk,
	onSource,
	onName
) => {
	const lines = source.match(SPLIT_LINES_REGEX);
	if (lines === null) {
		return {
			generatedLine: 1,
			generatedColumn: 0
		};
	}
	const { sources, sourcesContent, names, mappings } = sourceMap;
	for (let i = 0; i < sources.length; i++) {
		onSource(i, getSource(sourceMap, i), sourcesContent && sourcesContent[i]);
	}
	if (names) {
		for (let i = 0; i < names.length; i++) {
			onName(i, names[i]);
		}
	}

	let currentGeneratedLine = 1;
	let currentGeneratedColumn = 0;

	let mappingActive = false;
	let activeMappingSourceIndex = -1;
	let activeMappingOriginalLine = -1;
	let activeMappingOriginalColumn = -1;
	let activeMappingNameIndex = -1;

	const onMapping = (
		generatedLine,
		generatedColumn,
		sourceIndex,
		originalLine,
		originalColumn,
		nameIndex
	) => {
		if (mappingActive && currentGeneratedLine <= lines.length) {
			let chunk;
			const mappingLine = currentGeneratedLine;
			const mappingColumn = currentGeneratedColumn;
			const line = lines[currentGeneratedLine - 1];
			if (generatedLine !== currentGeneratedLine) {
				chunk = line.slice(currentGeneratedColumn);
				currentGeneratedLine++;
				currentGeneratedColumn = 0;
			} else {
				chunk = line.slice(currentGeneratedColumn, generatedColumn);
				currentGeneratedColumn = generatedColumn;
			}
			if (chunk) {
				onChunk(
					chunk,
					mappingLine,
					mappingColumn,
					activeMappingSourceIndex,
					activeMappingOriginalLine,
					activeMappingOriginalColumn,
					activeMappingNameIndex
				);
			}
			mappingActive = false;
		}
		if (generatedLine > currentGeneratedLine && currentGeneratedColumn > 0) {
			if (currentGeneratedLine <= lines.length) {
				const chunk = lines[currentGeneratedLine - 1].slice(
					currentGeneratedColumn
				);
				onChunk(
					chunk,
					currentGeneratedLine,
					currentGeneratedColumn,
					-1,
					-1,
					-1,
					-1
				);
			}
			currentGeneratedLine++;
			currentGeneratedColumn = 0;
		}
		while (generatedLine > currentGeneratedLine) {
			if (currentGeneratedLine <= lines.length) {
				onChunk(
					lines[currentGeneratedLine - 1],
					currentGeneratedLine,
					0,
					-1,
					-1,
					-1,
					-1
				);
			}
			currentGeneratedLine++;
		}
		if (generatedColumn > currentGeneratedColumn) {
			if (currentGeneratedLine <= lines.length) {
				const chunk = lines[currentGeneratedLine - 1].slice(
					currentGeneratedColumn,
					generatedColumn
				);
				onChunk(
					chunk,
					currentGeneratedLine,
					currentGeneratedColumn,
					-1,
					-1,
					-1,
					-1
				);
			}
			currentGeneratedColumn = generatedColumn;
		}
		if (sourceIndex >= 0) {
			mappingActive = true;
			activeMappingSourceIndex = sourceIndex;
			activeMappingOriginalLine = originalLine;
			activeMappingOriginalColumn = originalColumn;
			activeMappingNameIndex = nameIndex;
		}
	};
	readMappings(mappings, onMapping);
	onMapping(lines.length + 1, 0, -1, -1, -1, -1);
	const lastLine = lines[lines.length - 1];
	const lastNewLine = lastLine.endsWith("\n");
	return lastNewLine
		? {
				generatedLine: lines.length + 1,
				generatedColumn: 0
		  }
		: {
				generatedLine: lines.length,
				generatedColumn: lastLine.length
		  };
};

const streamChunksOfSourceMapFinal = (
	source,
	sourceMap,
	onChunk,
	onSource,
	onName
) => {
	const { sources, sourcesContent, names, mappings } = sourceMap;
	for (let i = 0; i < sources.length; i++) {
		onSource(i, getSource(sourceMap, i), sourcesContent && sourcesContent[i]);
	}
	if (names) {
		for (let i = 0; i < names.length; i++) {
			onName(i, names[i]);
		}
	}

	let mappingActiveLine = 0;

	const onMapping = (
		generatedLine,
		generatedColumn,
		sourceIndex,
		originalLine,
		originalColumn,
		nameIndex
	) => {
		if (sourceIndex >= 0) {
			onChunk(
				undefined,
				generatedLine,
				generatedColumn,
				sourceIndex,
				originalLine,
				originalColumn,
				nameIndex
			);
			mappingActiveLine = generatedLine;
		} else if (mappingActiveLine === generatedLine) {
			onChunk(undefined, generatedLine, generatedColumn, -1, -1, -1, -1);
			mappingActiveLine = 0;
		}
	};
	readMappings(mappings, onMapping);
	return getGeneratedSourceInfo(source);
};

module.exports = (
	source,
	sourceMap,
	onChunk,
	onSource,
	onName,
	finalSource
) => {
	return finalSource
		? streamChunksOfSourceMapFinal(source, sourceMap, onChunk, onSource, onName)
		: streamChunksOfSourceMapFull(source, sourceMap, onChunk, onSource, onName);
};
