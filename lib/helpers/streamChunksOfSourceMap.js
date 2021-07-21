/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const getSource = require("./getSource");
const readMappings = require("./readMappings");

const SPLIT_LINES_REGEX = /[^\n]+\n?|\n/g;

const streamChunksOfSourceMap = (
	source,
	sourceMap,
	onChunk,
	onSource,
	onName
) => {
	const lines = source.match(SPLIT_LINES_REGEX);
	if (lines === null) return;
	const { sources, sourcesContent, names, mappings } = sourceMap;
	for (let i = 0; i < sources.length; i++) {
		onSource(i, getSource(sourceMap, i), sourcesContent && sourcesContent[i]);
	}
	for (let i = 0; i < names.length; i++) {
		onName(i, names[i]);
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
		originalColumnn,
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
			activeMappingOriginalColumn = originalColumnn;
			activeMappingNameIndex = nameIndex;
		}
	};
	readMappings(mappings, onMapping);
	onMapping(lines.length + 1, 0, -1, -1, -1, -1);
};

module.exports = streamChunksOfSourceMap;
