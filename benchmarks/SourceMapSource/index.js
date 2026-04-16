/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { SourceMapSource } = require("../../lib");
const {
	fixtureCode,
	fixtureBuffer,
	fixtureMap,
	noop,
} = require("../_shared/fixtures");
const { createHash } = require("../_shared/hash");

const fixtureMapString = JSON.stringify(fixtureMap);
const fixtureMapBuffer = Buffer.from(fixtureMapString, "utf8");

/**
 * @param {import("tinybench").Bench} bench bench
 */
module.exports = (bench) => {
	bench
		.add("SourceMapSource: new (string map object)", () => {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap);
		})
		.add("SourceMapSource: new (string map as string)", () => {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMapString);
		})
		.add("SourceMapSource: new (string map as buffer)", () => {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMapBuffer);
		})
		.add("SourceMapSource: new (buffer value)", () => {
			new SourceMapSource(fixtureBuffer, "fixture.js", fixtureMap);
		})
		.add("SourceMapSource: source()", () => {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).source();
		})
		.add("SourceMapSource: buffer()", () => {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).buffer();
		})
		.add("SourceMapSource: size()", () => {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).size();
		})
		.add("SourceMapSource: getArgsAsBuffers()", () => {
			new SourceMapSource(
				fixtureCode,
				"fixture.js",
				fixtureMap,
			).getArgsAsBuffers();
		})
		.add("SourceMapSource: map()", () => {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).map({});
		})
		.add("SourceMapSource: map({columns:false})", () => {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).map({
				columns: false,
			});
		})
		.add("SourceMapSource: sourceAndMap()", () => {
			new SourceMapSource(
				fixtureCode,
				"fixture.js",
				fixtureMap,
			).sourceAndMap({});
		})
		.add("SourceMapSource: sourceAndMap({columns:false})", () => {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).sourceAndMap({
				columns: false,
			});
		})
		.add("SourceMapSource: streamChunks()", () => {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).streamChunks(
				{},
				noop,
				noop,
				noop,
			);
		})
		.add("SourceMapSource: streamChunks({columns:false})", () => {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).streamChunks(
				{ columns: false },
				noop,
				noop,
				noop,
			);
		})
		.add("SourceMapSource: streamChunks({finalSource:true})", () => {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).streamChunks(
				{ finalSource: true },
				noop,
				noop,
				noop,
			);
		})
		.add("SourceMapSource: streamChunks() (combined inner map)", () => {
			new SourceMapSource(
				fixtureCode,
				"fixture.js",
				fixtureMap,
				fixtureCode,
				fixtureMap,
			).streamChunks({}, noop, noop, noop);
		})
		.add("SourceMapSource: updateHash()", () => {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).updateHash(
				createHash(),
			);
		});
};
