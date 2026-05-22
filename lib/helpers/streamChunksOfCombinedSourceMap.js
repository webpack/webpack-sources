/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const splitIntoLines = require("./splitIntoLines");
const streamChunksOfSourceMap = require("./streamChunksOfSourceMap");

/** @typedef {import("../Source").RawSourceMap} RawSourceMap */
/** @typedef {import("./getGeneratedSourceInfo").GeneratedSourceInfo} GeneratedSourceInfo */
/** @typedef {import("./streamChunks").OnChunk} onChunk */
/** @typedef {import("./streamChunks").OnName} OnName */
/** @typedef {import("./streamChunks").OnSource} OnSource */
/** @typedef {import("./streamChunks").OnSourceInfo} OnSourceInfo */
/** @typedef {import("./streamChunks").SourceInfo} SourceInfo */

/**
 * @param {string} source source
 * @param {RawSourceMap} sourceMap source map
 * @param {string} innerSourceName inner source name
 * @param {string} innerSource inner source
 * @param {RawSourceMap} innerSourceMap inner source map
 * @param {boolean | undefined} removeInnerSource do remove inner source
 * @param {onChunk} onChunk on chunk
 * @param {OnSource} onSource on source
 * @param {OnName} onName on name
 * @param {boolean} finalSource finalSource
 * @param {boolean} columns columns
 * @param {undefined | OnSourceInfo=} onSourceInfo optional per-source extras
 * side-channel (currently for `ignoreList`); see `./streamChunks.js` for
 * the rationale on routing this off the hot `onSource` callback.
 * @returns {GeneratedSourceInfo} generated source info
 */
const streamChunksOfCombinedSourceMap = (
	source,
	sourceMap,
	innerSourceName,
	innerSource,
	innerSourceMap,
	removeInnerSource,
	onChunk,
	onSource,
	onName,
	finalSource,
	columns,
	onSourceInfo,
) => {
	/** @type {Map<string | null, number>} */
	const sourceMapping = new Map();
	/** @type {Map<string, number>} */
	const nameMapping = new Map();
	/** @type {number[]} */
	const sourceIndexMapping = [];
	/** @type {number[]} */
	const nameIndexMapping = [];
	/** @type {string[]} */
	const nameIndexValueMapping = [];
	let outerSourceIndex = -2;
	/** @type {undefined | SourceInfo} */
	let innerSourceNameInfo;
	/** @type {number[]} */
	const innerSourceIndexMapping = [];
	/** @type {[string | null, string | undefined][]} */
	const innerSourceIndexValueMapping = [];
	// Side-channel info per inner local source index. Populated by the
	// inner stream's `onSourceInfo` callback (separate from `onSource` so
	// the 3-arg `onSource` call site stays monomorphic). Lookup happens
	// when we emit the inner source globally further down.
	/** @type {(SourceInfo | undefined)[]} */
	const innerSourceIndexInfoMapping = [];
	/** @type {(string | undefined)[]} */
	const innerSourceContents = [];
	/** @type {(null | undefined | string[])[]} */
	const innerSourceContentLines = [];
	/** @type {number[]} */
	const innerNameIndexMapping = [];
	/** @type {string[]} */
	const innerNameIndexValueMapping = [];
	/** @typedef {[number, number, number, number, number] | number[]} MappingsData */
	/** @type {{ chunks: string[], mappingsData: MappingsData }[]} */
	const innerSourceMapLineData = [];
	/**
	 * @param {number} line line
	 * @param {number} column column
	 * @returns {number} result
	 */
	const findInnerMapping = (line, column) => {
		if (line > innerSourceMapLineData.length) return -1;
		const { mappingsData } = innerSourceMapLineData[line - 1];
		let l = 0;
		// `mappingsData.length` is always a multiple of 5 (five values pushed
		// per mapping), so dividing is exact. Coerce the bound to an int32 so
		// the binary-search loop stays on V8's fast small-int path instead of
		// comparing an int against a float.
		let r = (mappingsData.length / 5) | 0;
		while (l < r) {
			const m = (l + r) >> 1;
			if (mappingsData[m * 5] <= column) {
				l = m + 1;
			} else {
				r = m;
			}
		}
		if (l === 0) return -1;
		return l - 1;
	};
	return streamChunksOfSourceMap(
		source,
		sourceMap,
		(
			chunk,
			generatedLine,
			generatedColumn,
			sourceIndex,
			originalLine,
			originalColumn,
			nameIndex,
		) => {
			// Check if this is a mapping to the inner source
			if (sourceIndex === outerSourceIndex) {
				// Check if there is a mapping in the inner source
				const idx = findInnerMapping(originalLine, originalColumn);
				if (idx !== -1) {
					const { chunks, mappingsData } =
						innerSourceMapLineData[originalLine - 1];
					const mi = idx * 5;
					const innerSourceIndex = mappingsData[mi + 1];
					const innerOriginalLine = mappingsData[mi + 2];
					let innerOriginalColumn = mappingsData[mi + 3];
					let innerNameIndex = mappingsData[mi + 4];
					if (innerSourceIndex >= 0) {
						// Check for an identity mapping
						// where we are allowed to adjust the original column
						const innerChunk = chunks[idx];
						const innerGeneratedColumn = mappingsData[mi];
						const locationInChunk = originalColumn - innerGeneratedColumn;
						if (locationInChunk > 0) {
							let originalSourceLines =
								innerSourceIndex < innerSourceContentLines.length
									? innerSourceContentLines[innerSourceIndex]
									: null;
							if (originalSourceLines === undefined) {
								const originalSource = innerSourceContents[innerSourceIndex];
								originalSourceLines = originalSource
									? splitIntoLines(originalSource)
									: null;
								innerSourceContentLines[innerSourceIndex] = originalSourceLines;
							}
							if (originalSourceLines !== null) {
								const originalChunk =
									innerOriginalLine <= originalSourceLines.length
										? originalSourceLines[innerOriginalLine - 1].slice(
												innerOriginalColumn,
												innerOriginalColumn + locationInChunk,
											)
										: "";
								if (innerChunk.slice(0, locationInChunk) === originalChunk) {
									innerOriginalColumn += locationInChunk;
									innerNameIndex = -1;
								}
							}
						}

						// We have a inner mapping to original source

						// emit source when needed and compute global source index
						let sourceIndex =
							innerSourceIndex < innerSourceIndexMapping.length
								? innerSourceIndexMapping[innerSourceIndex]
								: -2;
						if (sourceIndex === -2) {
							const [source, sourceContent] =
								innerSourceIndex < innerSourceIndexValueMapping.length
									? innerSourceIndexValueMapping[innerSourceIndex]
									: [null, undefined];
							let globalIndex = sourceMapping.get(source);
							if (globalIndex === undefined) {
								sourceMapping.set(source, (globalIndex = sourceMapping.size));
								onSource(globalIndex, source, sourceContent);
								// If the inner emitted side-channel info for this
								// inner local index, propagate it to the caller's
								// onSourceInfo with the remapped global index.
								const info =
									innerSourceIndex < innerSourceIndexInfoMapping.length
										? innerSourceIndexInfoMapping[innerSourceIndex]
										: undefined;
								if (info !== undefined && onSourceInfo !== undefined) {
									onSourceInfo(globalIndex, info);
								}
							}
							sourceIndex = globalIndex;
							innerSourceIndexMapping[innerSourceIndex] = sourceIndex;
						}

						// emit name when needed and compute global name index
						let finalNameIndex = -1;
						if (innerNameIndex >= 0) {
							// when we have a inner name
							finalNameIndex =
								innerNameIndex < innerNameIndexMapping.length
									? innerNameIndexMapping[innerNameIndex]
									: -2;
							if (finalNameIndex === -2) {
								const name =
									innerNameIndex < innerNameIndexValueMapping.length
										? innerNameIndexValueMapping[innerNameIndex]
										: undefined;
								if (name) {
									let globalIndex = nameMapping.get(name);
									if (globalIndex === undefined) {
										nameMapping.set(name, (globalIndex = nameMapping.size));
										onName(globalIndex, name);
									}
									finalNameIndex = globalIndex;
								} else {
									finalNameIndex = -1;
								}
								innerNameIndexMapping[innerNameIndex] = finalNameIndex;
							}
						} else if (nameIndex >= 0) {
							// when we don't have an inner name,
							// but we have an outer name
							// it can be used when inner original code equals to the name
							let originalSourceLines =
								innerSourceContentLines[innerSourceIndex];
							if (originalSourceLines === undefined) {
								const originalSource = innerSourceContents[innerSourceIndex];
								originalSourceLines = originalSource
									? splitIntoLines(originalSource)
									: null;
								innerSourceContentLines[innerSourceIndex] = originalSourceLines;
							}
							if (originalSourceLines !== null) {
								const name = nameIndexValueMapping[nameIndex];
								const originalName =
									innerOriginalLine <= originalSourceLines.length
										? originalSourceLines[innerOriginalLine - 1].slice(
												innerOriginalColumn,
												innerOriginalColumn + name.length,
											)
										: "";
								if (name === originalName) {
									finalNameIndex =
										nameIndex < nameIndexMapping.length
											? nameIndexMapping[nameIndex]
											: -2;
									if (finalNameIndex === -2) {
										const name = nameIndexValueMapping[nameIndex];
										if (name) {
											let globalIndex = nameMapping.get(name);
											if (globalIndex === undefined) {
												nameMapping.set(name, (globalIndex = nameMapping.size));
												onName(globalIndex, name);
											}
											finalNameIndex = globalIndex;
										} else {
											finalNameIndex = -1;
										}
										nameIndexMapping[nameIndex] = finalNameIndex;
									}
								}
							}
						}
						onChunk(
							chunk,
							generatedLine,
							generatedColumn,
							sourceIndex,
							innerOriginalLine,
							innerOriginalColumn,
							finalNameIndex,
						);
						return;
					}
				}

				// We have a mapping to the inner source, but no inner mapping
				if (removeInnerSource) {
					onChunk(chunk, generatedLine, generatedColumn, -1, -1, -1, -1);
					return;
				}
				if (sourceIndexMapping[sourceIndex] === -2) {
					let globalIndex = sourceMapping.get(innerSourceName);
					if (globalIndex === undefined) {
						sourceMapping.set(source, (globalIndex = sourceMapping.size));
						onSource(globalIndex, innerSourceName, innerSource);
						// The outer map attributed an ignoreList entry to the
						// inner source name — preserve it on the merged result.
						if (
							innerSourceNameInfo !== undefined &&
							onSourceInfo !== undefined
						) {
							onSourceInfo(globalIndex, innerSourceNameInfo);
						}
					}
					sourceIndexMapping[sourceIndex] = globalIndex;
				}
			}

			const finalSourceIndex =
				sourceIndex < 0 || sourceIndex >= sourceIndexMapping.length
					? -1
					: sourceIndexMapping[sourceIndex];
			if (finalSourceIndex < 0) {
				// no source, so we make it a generated chunk
				onChunk(chunk, generatedLine, generatedColumn, -1, -1, -1, -1);
			} else {
				// Pass through the chunk with mapping
				let finalNameIndex = -1;
				if (nameIndex >= 0 && nameIndex < nameIndexMapping.length) {
					finalNameIndex = nameIndexMapping[nameIndex];
					if (finalNameIndex === -2) {
						const name = nameIndexValueMapping[nameIndex];
						let globalIndex = nameMapping.get(name);
						if (globalIndex === undefined) {
							nameMapping.set(name, (globalIndex = nameMapping.size));
							onName(globalIndex, name);
						}
						finalNameIndex = globalIndex;
						nameIndexMapping[nameIndex] = finalNameIndex;
					}
				}
				onChunk(
					chunk,
					generatedLine,
					generatedColumn,
					finalSourceIndex,
					originalLine,
					originalColumn,
					finalNameIndex,
				);
			}
		},
		(i, source, sourceContent) => {
			if (source === innerSourceName) {
				outerSourceIndex = i;
				if (innerSource !== undefined) sourceContent = innerSource;
				else innerSource = /** @type {string} */ (sourceContent);
				sourceIndexMapping[i] = -2;
				streamChunksOfSourceMap(
					/** @type {string} */
					(sourceContent),
					innerSourceMap,
					(
						chunk,
						generatedLine,
						generatedColumn,
						sourceIndex,
						originalLine,
						originalColumn,
						nameIndex,
					) => {
						while (innerSourceMapLineData.length < generatedLine) {
							innerSourceMapLineData.push({
								mappingsData: [],
								chunks: [],
							});
						}
						const data = innerSourceMapLineData[generatedLine - 1];
						data.mappingsData.push(
							generatedColumn,
							sourceIndex,
							originalLine,
							originalColumn,
							nameIndex,
						);
						data.chunks.push(/** @type {string} */ (chunk));
					},
					(i, source, sourceContent) => {
						innerSourceContents[i] = sourceContent;
						innerSourceContentLines[i] = undefined;
						innerSourceIndexMapping[i] = -2;
						innerSourceIndexValueMapping[i] = [source, sourceContent];
					},
					(i, name) => {
						innerNameIndexMapping[i] = -2;
						innerNameIndexValueMapping[i] = name;
					},
					false,
					columns,
					// Inner onSourceInfo: stash per-inner-index so that when we
					// later emit the corresponding global source (during chunk
					// processing) we can forward the info via the caller's
					// onSourceInfo with the remapped global index.
					onSourceInfo === undefined
						? undefined
						: (innerIdx, info) => {
								innerSourceIndexInfoMapping[innerIdx] = info;
							},
				);
			} else {
				let globalIndex = sourceMapping.get(source);
				if (globalIndex === undefined) {
					sourceMapping.set(source, (globalIndex = sourceMapping.size));
					onSource(globalIndex, source, sourceContent);
				}
				sourceIndexMapping[i] = globalIndex;
			}
		},
		(i, name) => {
			nameIndexMapping[i] = -2;
			nameIndexValueMapping[i] = name;
		},
		finalSource,
		columns,
		// Outer onSourceInfo: bridge the outer map's per-source extras to
		// the caller's onSourceInfo, after remapping outer→global index.
		// Special-cased: when the info belongs to the inner-source-name
		// slot, stash it for the "no inner mapping" fallback emission.
		onSourceInfo === undefined
			? undefined
			: (outerIdx, info) => {
					if (outerIdx === outerSourceIndex) {
						innerSourceNameInfo = info;
						return;
					}
					const globalIndex =
						outerIdx < sourceIndexMapping.length
							? sourceIndexMapping[outerIdx]
							: undefined;
					if (globalIndex !== undefined && globalIndex >= 0) {
						onSourceInfo(globalIndex, info);
					}
				},
	);
};

module.exports = streamChunksOfCombinedSourceMap;
