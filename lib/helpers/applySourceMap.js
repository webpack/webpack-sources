/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const SourceNode = require("source-map").SourceNode;
const readMappings = require("./readMappings");
const getSource = require("./getSource");

/** @typedef {{ generatedLine: number, generatedColumn: number, sourceIndex: number, originalLine: number, originalColumn: number, nameIndex: number }} Mapping */

const applySourceMap = function (
	sourceNode,
	sourceMap,
	sourceFile,
	removeGeneratedCodeForSourceFile
) {
	// The following notations are used to name stuff:
	// Left <------------> Middle <-------------------> Right
	// Input arguments:
	//        sourceNode                                       - Code mapping from Left to Middle
	//                   sourceFile                            - Name of a Middle file
	//                              sourceMap                  - Code mapping from Middle to Right
	// Variables:
	//           l2m                      m2r
	// Left <-----------------------------------------> Right
	// Variables:
	//                       l2r

	const l2rResult = new SourceNode();
	const l2rOutput = [];

	const middleSourceContents = new Map();

	/** @type {Mapping[][]} */
	const m2rMappingsByLine = [];

	const m2rSourceToIndex = new Map();

	const rightSourceContentsSet = new Set();
	const rightSourceContentsLines = new Map();

	// Store all mappings by generated line
	readMappings(
		sourceMap.mappings,
		(
			generatedLine,
			generatedColumn,
			sourceIndex,
			originalLine,
			originalColumn,
			nameIndex
		) => {
			// avoid holey array
			while (m2rMappingsByLine.length < generatedLine) {
				m2rMappingsByLine.push([]);
			}
			let arr = m2rMappingsByLine[generatedLine - 1];
			arr.push({
				generatedLine,
				generatedColumn,
				sourceIndex,
				originalLine,
				originalColumn,
				nameIndex
			});
		}
	);

	for (let i = 0, arr = sourceMap.sources; i < arr.length; i++) {
		m2rSourceToIndex.set(getSource(sourceMap, i), i);
	}

	/**
	 * @param {number} line line
	 * @param {number} column column
	 * @returns {Mapping | undefined} the mapping
	 */
	const findM2rMapping = (line, column) => {
		const m2rMappings = m2rMappingsByLine[line - 1];
		let l = 0;
		let r = m2rMappings.length;
		while (l < r) {
			let m = (l + r) >> 1;
			if (m2rMappings[m].generatedColumn <= column) {
				l = m + 1;
			} else {
				r = m;
			}
		}
		if (l === 0) return undefined;
		return m2rMappings[l - 1];
	};

	// Store all source contents
	sourceNode.walkSourceContents(function (source, content) {
		middleSourceContents.set(source, content);
	});

	const middleSource = middleSourceContents.get(sourceFile);
	const middleSourceLines = middleSource ? middleSource.split("\n") : undefined;

	// Walk all left to middle mappings
	sourceNode.walk(function (chunk, middleMapping) {
		// Find a mapping from middle to right
		if (
			middleMapping.source === sourceFile &&
			middleMapping.line &&
			m2rMappingsByLine[middleMapping.line]
		) {
			// For minimized sources this is performance-relevant,
			// since all mappings are in a single line, use a binary search
			let m2rBestFit = findM2rMapping(middleMapping.line, middleMapping.column);
			if (m2rBestFit) {
				let allowMiddleName = false;
				let middleLine;
				let rightSourceContent;
				let rightSourceContentLines;
				const rightSourceIndex = m2rBestFit.sourceIndex;
				// Check if we have middle and right source for this mapping
				// Then we could have an "identify" mapping
				if (
					middleSourceLines &&
					rightSourceIndex >= 0 &&
					(middleLine = middleSourceLines[m2rBestFit.generatedLine - 1]) &&
					((rightSourceContentLines = rightSourceContentsLines.get(
						rightSourceIndex
					)) ||
						(rightSourceContent = sourceMap.sourcesContent[rightSourceIndex]))
				) {
					if (!rightSourceContentLines) {
						rightSourceContentLines = rightSourceContent.split("\n");
						rightSourceContentsLines.set(
							rightSourceIndex,
							rightSourceContentLines
						);
					}
					const rightLine =
						rightSourceContentLines[m2rBestFit.originalLine - 1];
					if (rightLine) {
						const offset = middleMapping.column - m2rBestFit.generatedColumn;
						if (offset > 0) {
							const middlePart = middleLine.slice(
								m2rBestFit.generatedColumn,
								middleMapping.column
							);
							const rightPart = rightLine.slice(
								m2rBestFit.originalColumn,
								m2rBestFit.originalColumn + offset
							);
							if (middlePart === rightPart) {
								// When original and generated code is equal we assume we have an "identity" mapping
								// In this case we can offset the original position
								m2rBestFit = Object.assign({}, m2rBestFit, {
									originalColumn: m2rBestFit.originalColumn + offset,
									generatedColumn: middleMapping.column,
									nameIndex: -1
								});
							}
						}
						if (!m2rBestFit.name && middleMapping.name) {
							allowMiddleName =
								rightLine.slice(
									m2rBestFit.originalColumn,
									m2rBestFit.originalColumn + middleMapping.name.length
								) === middleMapping.name;
						}
					}
				}

				// Construct a left to right node from the found middle to right mapping
				let sourceIndex = m2rBestFit.sourceIndex;
				if (sourceIndex >= 0) {
					const source = getSource(sourceMap, sourceIndex);
					l2rOutput.push(
						new SourceNode(
							m2rBestFit.originalLine,
							m2rBestFit.originalColumn,
							source,
							chunk,
							allowMiddleName ? middleMapping.name : m2rBestFit.name
						)
					);

					// Set the source contents once
					if (!rightSourceContentsSet.has(sourceIndex)) {
						rightSourceContentsSet.add(sourceIndex);
						const sourceContent = sourceMap.sourcesContent[sourceIndex];
						if (sourceContent) {
							l2rResult.setSourceContent(source, sourceContent);
						}
					}
					return;
				}
			}
		}

		if (
			(removeGeneratedCodeForSourceFile &&
				middleMapping.source === sourceFile) ||
			!middleMapping.source
		) {
			// Construct a left to middle node with only generated code
			// Because user do not want mappings to middle sources
			// Or this chunk has no mapping
			l2rOutput.push(chunk);
			return;
		}

		// Construct a left to middle node
		const source = middleMapping.source;
		const sourceIndex = m2rSourceToIndex.get(source);
		if (sourceIndex === undefined) {
			l2rOutput.push(
				new SourceNode(
					middleMapping.line,
					middleMapping.column,
					source,
					chunk,
					middleMapping.name
				)
			);
			const sourceContent = middleSourceContents.get(source);
			if (sourceContent !== undefined) {
				l2rResult.setSourceContent(source, sourceContent);
				middleSourceContents.delete(source);
			}
		} else {
			// For sources that are replaced by a new source
			l2rOutput.push(chunk);
		}
	});

	// Put output into the resulting SourceNode
	l2rResult.add(l2rOutput);
	return l2rResult;
};

module.exports = applySourceMap;
