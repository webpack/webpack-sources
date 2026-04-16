/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const {
	OriginalSource,
	PrefixSource,
	RawSource,
	SourceMapSource,
} = require("../../lib");
const { fixtureCode, fixtureMap, noop } = require("../_shared/fixtures");
const { createHash } = require("../_shared/hash");

/**
 * @param {import("tinybench").Bench} bench bench
 */
module.exports = (bench) => {
	bench
		.add("PrefixSource: new PrefixSource(str, string)", () => {
			new PrefixSource("\t", fixtureCode);
		})
		.add("PrefixSource: new PrefixSource(str, Source)", () => {
			new PrefixSource("\t", new OriginalSource(fixtureCode, "fixture.js"));
		})
		.add("PrefixSource: getPrefix()", () => {
			new PrefixSource("\t", fixtureCode).getPrefix();
		})
		.add("PrefixSource: original()", () => {
			new PrefixSource("\t", new RawSource(fixtureCode)).original();
		})
		.add("PrefixSource: source() (RawSource child)", () => {
			new PrefixSource("\t", new RawSource(fixtureCode)).source();
		})
		.add("PrefixSource: source() (OriginalSource child)", () => {
			new PrefixSource(
				"\t",
				new OriginalSource(fixtureCode, "fixture.js"),
			).source();
		})
		.add("PrefixSource: buffer()", () => {
			new PrefixSource("\t", new RawSource(fixtureCode)).buffer();
		})
		.add("PrefixSource: size()", () => {
			new PrefixSource("\t", new RawSource(fixtureCode)).size();
		})
		.add("PrefixSource: map()", () => {
			new PrefixSource(
				"\t",
				new OriginalSource(fixtureCode, "fixture.js"),
			).map({});
		})
		.add("PrefixSource: sourceAndMap()", () => {
			new PrefixSource(
				"\t",
				new OriginalSource(fixtureCode, "fixture.js"),
			).sourceAndMap({});
		})
		.add("PrefixSource: streamChunks()", () => {
			new PrefixSource(
				"\t",
				new OriginalSource(fixtureCode, "fixture.js"),
			).streamChunks({}, noop, noop, noop);
		})
		.add("PrefixSource: streamChunks() with SourceMapSource child", () => {
			new PrefixSource(
				"  ",
				new SourceMapSource(fixtureCode, "fixture.js", fixtureMap),
			).streamChunks({}, noop, noop, noop);
		})
		.add("PrefixSource: updateHash()", () => {
			new PrefixSource(
				"\t",
				new OriginalSource(fixtureCode, "fixture.js"),
			).updateHash(createHash());
		});
};
