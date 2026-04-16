/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const {
	CompatSource,
	OriginalSource,
	RawSource,
} = require("../../lib");
const { fixtureCode } = require("../_shared/fixtures");
const { createHash } = require("../_shared/hash");

// A minimal SourceLike that only exposes `source()` and `buffer()`.
const sourceLike = {
	source: () => fixtureCode,
	buffer: () => Buffer.from(fixtureCode, "utf8"),
};

// A richer SourceLike exposing the full interface.
const richSourceLike = {
	source: () => fixtureCode,
	buffer: () => Buffer.from(fixtureCode, "utf8"),
	size: () => fixtureCode.length,
	map: () => null,
	sourceAndMap: () => ({ source: fixtureCode, map: null }),
	updateHash: (hash) => {
		hash.update(fixtureCode);
	},
};

/**
 * @param {import("tinybench").Bench} bench bench
 */
module.exports = (bench) => {
	bench
		.add("CompatSource: CompatSource.from(Source)", () => {
			CompatSource.from(new RawSource(fixtureCode));
		})
		.add("CompatSource: CompatSource.from(SourceLike)", () => {
			CompatSource.from(sourceLike);
		})
		.add("CompatSource: source() (wrapping SourceLike)", () => {
			new CompatSource(sourceLike).source();
		})
		.add("CompatSource: buffer() (fallback via super)", () => {
			new CompatSource({ source: () => fixtureCode }).buffer();
		})
		.add("CompatSource: buffer() (delegated)", () => {
			new CompatSource(sourceLike).buffer();
		})
		.add("CompatSource: size() (fallback via super)", () => {
			new CompatSource({ source: () => fixtureCode }).size();
		})
		.add("CompatSource: size() (delegated)", () => {
			new CompatSource(richSourceLike).size();
		})
		.add("CompatSource: map()", () => {
			new CompatSource(richSourceLike).map({});
		})
		.add("CompatSource: sourceAndMap()", () => {
			new CompatSource(richSourceLike).sourceAndMap({});
		})
		.add("CompatSource: updateHash() (delegated)", () => {
			new CompatSource(richSourceLike).updateHash(createHash());
		})
		.add("CompatSource: updateHash() (fallback)", () => {
			new CompatSource({ source: () => fixtureCode }).updateHash(createHash());
		})
		.add("CompatSource: wraps OriginalSource", () => {
			const cs = new CompatSource(new OriginalSource(fixtureCode, "fix.js"));
			cs.source();
			cs.buffer();
			cs.size();
			cs.map({});
		});
};
