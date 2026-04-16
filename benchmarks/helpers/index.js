/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const getGeneratedSourceInfo = require("../../lib/helpers/getGeneratedSourceInfo");
const getName = require("../../lib/helpers/getName");
const getSource = require("../../lib/helpers/getSource");
const readMappings = require("../../lib/helpers/readMappings");
const splitIntoLines = require("../../lib/helpers/splitIntoLines");
const splitIntoPotentialTokens = require("../../lib/helpers/splitIntoPotentialTokens");
const stringBufferUtils = require("../../lib/helpers/stringBufferUtils");
const { SourceMapSource } = require("../../lib");
const {
	fixtureCode,
	fixtureMap,
	bigSource,
	longLine,
} = require("../_shared/fixtures");

const mappings = fixtureMap.mappings;

/**
 * @param {import("tinybench").Bench} bench bench
 */
module.exports = (bench) => {
	bench
		// splitIntoLines
		.add("helpers: splitIntoLines (fixture)", () => {
			splitIntoLines(fixtureCode);
		})
		.add("helpers: splitIntoLines (big source)", () => {
			splitIntoLines(bigSource);
		})
		.add("helpers: splitIntoLines (long lines)", () => {
			splitIntoLines(longLine);
		})
		.add("helpers: splitIntoLines (empty)", () => {
			splitIntoLines("");
		})
		// splitIntoPotentialTokens
		.add("helpers: splitIntoPotentialTokens (fixture)", () => {
			splitIntoPotentialTokens(fixtureCode);
		})
		.add("helpers: splitIntoPotentialTokens (big source)", () => {
			splitIntoPotentialTokens(bigSource);
		})
		// getGeneratedSourceInfo
		.add("helpers: getGeneratedSourceInfo (fixture)", () => {
			getGeneratedSourceInfo(fixtureCode);
		})
		.add("helpers: getGeneratedSourceInfo (big source)", () => {
			getGeneratedSourceInfo(bigSource);
		})
		.add("helpers: getGeneratedSourceInfo (single line)", () => {
			getGeneratedSourceInfo("const a = 1;");
		})
		.add("helpers: getGeneratedSourceInfo (undefined)", () => {
			getGeneratedSourceInfo(undefined);
		})
		// getName / getSource (map accessors)
		.add("helpers: getName", () => {
			getName(fixtureMap, 0);
		})
		.add("helpers: getSource", () => {
			getSource(fixtureMap, 0);
		})
		// readMappings (exercises the VLQ decoder used by source-map aware paths)
		.add("helpers: readMappings (fixture)", () => {
			readMappings(mappings, () => {});
		})
		// stringBufferUtils
		.add("helpers: stringBufferUtils.internString (no interning)", () => {
			stringBufferUtils.internString(fixtureCode);
		})
		.add("helpers: stringBufferUtils.internString (with interning)", () => {
			stringBufferUtils.enterStringInterningRange();
			stringBufferUtils.internString(fixtureCode);
			stringBufferUtils.exitStringInterningRange();
		})
		// streamChunks dispatcher (the top-level helper used by ConcatSource etc.)
		.add("helpers: streamChunks dispatcher via SourceMapSource", () => {
			const streamChunks = require("../../lib/helpers/streamChunks");
			const src = new SourceMapSource(fixtureCode, "fixture.js", fixtureMap);
			streamChunks(
				src,
				{},
				() => {},
				() => {},
				() => {},
			);
		});
};
