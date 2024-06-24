/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const getGeneratedSourceInfo = require("./getGeneratedSourceInfo");
const splitIntoLines = require("./splitIntoLines");

/** @typedef {import("../Source").OnOriginalScope} OnOriginalScope */
/** @typedef {import("../Source").OnGeneratedRange} OnGeneratedRange */

/**
 * @param {string} source the source
 * @param {function(string, number, number, number, number, number, number): void} onChunk called for each chunk of code
 * @param {function(number, string, string)} onSource called for each source
 * @param {function(number, string)} onName called for each name
 * @param {OnOriginalScope} onOriginalScope called for each original scope
 * @param {OnGeneratedRange} onGeneratedRange called for each generated range
 * @returns {{ generatedLine: number, generatedColumn: number }} final generated position
 */
const streamChunksOfRawSource = (
	source,
	onChunk,
	onSource,
	onName,
	onOriginalScope,
	onGeneratedRange
) => {
	let line = 1;
	const matches = splitIntoLines(source);
	let match;
	for (match of matches) {
		onChunk(match, line, 0, -1, -1, -1, -1);
		line++;
	}
	return matches.length === 0 || match.endsWith("\n")
		? {
				generatedLine: matches.length + 1,
				generatedColumn: 0
		  }
		: {
				generatedLine: matches.length,
				generatedColumn: match.length
		  };
};

/**
 * @param {string} source the source
 * @param {function(string, number, number, number, number, number, number): void} onChunk called for each chunk of code
 * @param {function(number, string, string)} onSource called for each source
 * @param {function(number, string)} onName called for each name
 * @param {function(number, number, number, number, number, number[]): void} onOriginalScope called for each original scope
 * @param {function(number, number, number, number, number, number[]): void} onGeneratedRange called for each generated range
 * @param {boolean} finalSource true, if this is the final source
 * @returns {void}
 */
module.exports = (
	source,
	onChunk,
	onSource,
	onName,
	onOriginalScope,
	onGeneratedRange,
	finalSource
) => {
	return finalSource
		? getGeneratedSourceInfo(source)
		: streamChunksOfRawSource(
				source,
				onChunk,
				onSource,
				onName,
				onOriginalScope,
				onGeneratedRange
		  );
};
