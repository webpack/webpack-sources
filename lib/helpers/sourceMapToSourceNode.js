/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SourceNode } = require("source-map");
const getSource = require("./getSource");
const readMappings = require("./readMappings");

var REGEX_LINES = /(\n|[^\n]+\n?)/g;

const sourceMapToSourceNode = (source, sourceMap) => {
	const node = new SourceNode();
	const lines = source.match(REGEX_LINES);

	let currentGeneratedLine = 1;
	let currentGeneratedColumn = 0;

	let mappingActive = false;
	let activeMappingSourceIndex = -1;
	let activeMappingOriginalLine = -1;
	let activeMappingOriginalColumn = -1;
	let activeMappingNameIndex = -1;

	if (sourceMap.sourcesContent) {
		for (let i = 0, arr = sourceMap.sources; i < arr.length; i++) {
			const content = sourceMap.sourcesContent[i];
			node.setSourceContent(getSource(sourceMap, i), content);
		}
	}

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
				node.add(
					new SourceNode(
						activeMappingOriginalLine < 0 ? null : activeMappingOriginalLine,
						activeMappingOriginalColumn < 0
							? null
							: activeMappingOriginalColumn,
						getSource(sourceMap, activeMappingSourceIndex),
						chunk,
						activeMappingNameIndex < 0
							? null
							: sourceMap.names[activeMappingNameIndex]
					)
				);
			}
			mappingActive = false;
		}
		if (generatedLine > currentGeneratedLine && currentGeneratedColumn > 0) {
			if (currentGeneratedLine <= lines.length)
				node.add(lines[currentGeneratedLine - 1].slice(currentGeneratedColumn));
			currentGeneratedLine++;
			currentGeneratedColumn = 0;
		}
		while (generatedLine > currentGeneratedLine) {
			if (currentGeneratedLine <= lines.length)
				node.add(lines[currentGeneratedLine - 1]);
			currentGeneratedLine++;
			currentGeneratedColumn = 0;
		}
		if (generatedColumn > 0) {
			if (currentGeneratedLine <= lines.length)
				node.add(
					lines[currentGeneratedLine - 1].slice(
						currentGeneratedColumn,
						generatedColumn
					)
				);
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
	readMappings(sourceMap.mappings, onMapping);
	onMapping(lines.length + 1, 0, -1, -1, -1, -1);

	return node;
};

module.exports = sourceMapToSourceNode;
