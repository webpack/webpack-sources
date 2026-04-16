/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { OriginalSource, RawSource, ReplaceSource } = require("../../lib");
const {
	fixtureCode,
	bigSource,
	smallSource,
	noop,
} = require("../_shared/fixtures");
const { createHash } = require("../_shared/hash");

/**
 * Builds a ReplaceSource with `count` small replacements spread across `bigSource`.
 * @param {number} count count
 * @returns {ReplaceSource} source
 */
const buildManyReplacements = (count) => {
	const src = new ReplaceSource(new OriginalSource(bigSource, "big.js"));
	let idx = bigSource.indexOf("value");
	let i = 0;
	while (idx !== -1 && i < count) {
		src.replace(idx, idx + 4, "v", "value");
		idx = bigSource.indexOf("value", idx + 5);
		i++;
	}
	return src;
};

/**
 * Builds a ReplaceSource with a few large range replacements.
 * @returns {ReplaceSource} source
 */
const buildFewLargeReplacements = () => {
	const src = new ReplaceSource(new OriginalSource(bigSource, "big.js"));
	src.replace(100, 500, "/* replaced */");
	src.replace(5000, 8000, "/* replaced */");
	src.replace(20000, 30000, "/* replaced */");
	return src;
};

/**
 * @param {import("tinybench").Bench} bench bench
 */
module.exports = (bench) => {
	bench
		.add("ReplaceSource: new ReplaceSource()", () => {
			new ReplaceSource(new RawSource(fixtureCode));
		})
		.add("ReplaceSource: replace() x1000", () => {
			const src = new ReplaceSource(new OriginalSource(bigSource, "big.js"));
			for (let i = 0; i < 1000; i++) src.replace(i * 10, i * 10 + 3, "x");
		})
		.add("ReplaceSource: insert() x1000", () => {
			const src = new ReplaceSource(new OriginalSource(bigSource, "big.js"));
			for (let i = 0; i < 1000; i++) src.insert(i * 10, "y");
		})
		.add("ReplaceSource: source() (no replacements)", () => {
			new ReplaceSource(new RawSource(fixtureCode)).source();
		})
		.add("ReplaceSource: source() (small, 1 replacement)", () => {
			const src = new ReplaceSource(new RawSource(smallSource));
			src.replace(0, 7, "var");
			src.source();
		})
		.add("ReplaceSource: source() (1000 small replacements)", () => {
			buildManyReplacements(1000).source();
		})
		.add("ReplaceSource: source() (few large replacements)", () => {
			buildFewLargeReplacements().source();
		})
		.add("ReplaceSource: size() (1000 small replacements)", () => {
			buildManyReplacements(1000).size();
		})
		.add("ReplaceSource: buffer() (1000 small replacements)", () => {
			buildManyReplacements(1000).buffer();
		})
		.add("ReplaceSource: map() (no replacements)", () => {
			new ReplaceSource(new OriginalSource(fixtureCode, "fix.js")).map({});
		})
		.add("ReplaceSource: map()", () => {
			const src = new ReplaceSource(
				new OriginalSource(fixtureCode, "fix.js"),
			);
			src.replace(0, 10, "/* hdr */");
			src.insert(200, "// inj\n");
			src.map({});
		})
		.add("ReplaceSource: sourceAndMap()", () => {
			const src = new ReplaceSource(
				new OriginalSource(fixtureCode, "fix.js"),
			);
			src.replace(0, 10, "/* hdr */");
			src.insert(200, "// inj\n");
			src.sourceAndMap({});
		})
		.add("ReplaceSource: streamChunks() (1000 replacements)", () => {
			buildManyReplacements(1000).streamChunks({}, noop, noop, noop);
		})
		.add("ReplaceSource: getReplacements()", () => {
			buildManyReplacements(1000).getReplacements();
		})
		.add("ReplaceSource: original()", () => {
			new ReplaceSource(new RawSource(fixtureCode)).original();
		})
		.add("ReplaceSource: updateHash()", () => {
			const src = new ReplaceSource(
				new OriginalSource(fixtureCode, "fix.js"),
				"fix",
			);
			src.replace(0, 10, "/* hdr */");
			src.insert(200, "// inj\n");
			src.updateHash(createHash());
		});
};
