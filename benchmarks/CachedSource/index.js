/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const {
	CachedSource,
	OriginalSource,
	RawSource,
	SourceMapSource,
} = require("../../lib");
const { fixtureCode, fixtureMap, noop } = require("../_shared/fixtures");
const { createHash } = require("../_shared/hash");

const warmed = (() => {
	const cached = new CachedSource(
		new SourceMapSource(fixtureCode, "fixture.js", fixtureMap),
	);
	cached.source();
	cached.map({});
	cached.sourceAndMap({});
	cached.buffer();
	cached.size();
	return cached;
})();

/**
 * @param {import("tinybench").Bench} bench bench
 */
module.exports = (bench) => {
	bench
		.add("CachedSource: new CachedSource()", () => {
			new CachedSource(new RawSource(fixtureCode));
		})
		.add("CachedSource: source() (cold)", () => {
			new CachedSource(new RawSource(fixtureCode)).source();
		})
		.add("CachedSource: source() (cached)", () => {
			warmed.source();
		})
		.add("CachedSource: buffer() (cached)", () => {
			warmed.buffer();
		})
		.add("CachedSource: size() (cached)", () => {
			warmed.size();
		})
		.add("CachedSource: map() (cold SourceMapSource)", () => {
			new CachedSource(
				new SourceMapSource(fixtureCode, "fixture.js", fixtureMap),
			).map({});
		})
		.add("CachedSource: map() (cached)", () => {
			warmed.map({});
		})
		.add("CachedSource: sourceAndMap() (cold OriginalSource)", () => {
			new CachedSource(
				new OriginalSource(fixtureCode, "fixture.js"),
			).sourceAndMap({});
		})
		.add("CachedSource: sourceAndMap() (cached)", () => {
			warmed.sourceAndMap({});
		})
		.add("CachedSource: streamChunks() (cold)", () => {
			new CachedSource(
				new OriginalSource(fixtureCode, "fixture.js"),
			).streamChunks({}, noop, noop, noop);
		})
		.add("CachedSource: streamChunks() (warm)", () => {
			warmed.streamChunks({}, noop, noop, noop);
		})
		.add("CachedSource: originalLazy()", () => {
			new CachedSource(() => new RawSource(fixtureCode)).originalLazy();
		})
		.add("CachedSource: getCachedData() then restore", () => {
			const a = new CachedSource(
				new OriginalSource(fixtureCode, "fixture.js"),
			);
			a.source();
			a.map({});
			const data = a.getCachedData();
			new CachedSource(new OriginalSource(fixtureCode, "fixture.js"), data);
		})
		.add("CachedSource: updateHash() (warm)", () => {
			warmed.updateHash(createHash());
		});
};
