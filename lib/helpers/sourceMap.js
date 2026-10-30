/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const getSource = require("./getSource");
const readMappings = require("./readMappings");

/** @typedef {import("../Source").RawSourceMap} RawSourceMap */

/**
 * Where a generated position came from: `line` counts from one, `column`
 * from zero, as in a stack trace.
 * @typedef {object} OriginalPosition
 * @property {string} source source, joined with the map's `sourceRoot`
 * @property {number} line line
 * @property {number} column column
 * @property {string | null} name name, if the mapping carries one
 */

/**
 * Finds the original position of a generated one: the closest mapping at or
 * before `column` on `line`. Decodes the whole map, so it suits a one-off
 * lookup (an error location), not a loop over many positions.
 * @param {RawSourceMap | string | Buffer} sourceMap source map, or its JSON
 * @param {number} line generated line, counting from one
 * @param {number} column generated column, counting from zero
 * @returns {OriginalPosition | null} original position, or `null` when nothing maps there
 */
const originalPositionFor = (sourceMap, line, column) => {
	/** @type {RawSourceMap} */
	const map =
		typeof sourceMap === "string" || Buffer.isBuffer(sourceMap)
			? JSON.parse(sourceMap.toString("utf8"))
			: sourceMap;
	let sourceIndex = -1;
	let originalLine = -1;
	let originalColumn = -1;
	let nameIndex = -1;
	// Mappings arrive in generated order, so the last one at or before
	// `column` on `line` is the closest.
	readMappings(
		map.mappings,
		(
			generatedLine,
			generatedColumn,
			mappingSourceIndex,
			mappingOriginalLine,
			mappingOriginalColumn,
			mappingNameIndex,
		) => {
			if (generatedLine !== line || generatedColumn > column) return;
			sourceIndex = mappingSourceIndex;
			originalLine = mappingOriginalLine;
			originalColumn = mappingOriginalColumn;
			nameIndex = mappingNameIndex;
		},
	);
	// An index past the end of `sources` or `names` is a malformed map.
	if (sourceIndex < 0 || sourceIndex >= map.sources.length) return null;
	return {
		source: /** @type {string} */ (getSource(map, sourceIndex)),
		line: originalLine,
		column: originalColumn,
		name:
			nameIndex >= 0 && map.names && nameIndex < map.names.length
				? map.names[nameIndex]
				: null,
	};
};

module.exports.originalPositionFor = originalPositionFor;
