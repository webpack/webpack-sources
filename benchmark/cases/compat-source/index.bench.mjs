/*
 * compat-source
 *
 * CompatSource wraps a SourceLike. Interesting paths: the direct delegation
 * (when the wrapped object provides buffer/size/map/updateHash) vs the
 * Source.prototype fallback (when it doesn't).
 */

import { createHash } from "crypto";
import sources from "../../../lib/index.js";
import { fixtureCode } from "../../fixtures.mjs";

const fixtureBuffer = Buffer.from(fixtureCode, "utf8");

const sourceLike = {
	source: () => fixtureCode,
	buffer: () => fixtureBuffer,
};

const richSourceLike = {
	source: () => fixtureCode,
	buffer: () => fixtureBuffer,
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
export default function register(bench) {
	bench.add("compat-source: CompatSource.from(Source)", () => {
		const src = new sources.RawSource(fixtureCode);
		for (let i = 0; i < 100; i++) sources.CompatSource.from(src);
	});

	bench.add("compat-source: CompatSource.from(SourceLike)", () => {
		for (let i = 0; i < 100; i++) sources.CompatSource.from(sourceLike);
	});

	bench.add("compat-source: source() (wrapping SourceLike)", () => {
		const cs = new sources.CompatSource(sourceLike);
		for (let i = 0; i < 500; i++) cs.source();
	});

	bench.add("compat-source: buffer() (fallback via super)", () => {
		const cs = new sources.CompatSource({ source: () => fixtureCode });
		for (let i = 0; i < 50; i++) cs.buffer();
	});

	bench.add("compat-source: buffer() (delegated)", () => {
		const cs = new sources.CompatSource(sourceLike);
		for (let i = 0; i < 500; i++) cs.buffer();
	});

	bench.add("compat-source: size() (fallback via super)", () => {
		const cs = new sources.CompatSource({ source: () => fixtureCode });
		for (let i = 0; i < 50; i++) cs.size();
	});

	bench.add("compat-source: size() (delegated)", () => {
		const cs = new sources.CompatSource(richSourceLike);
		for (let i = 0; i < 500; i++) cs.size();
	});

	bench.add("compat-source: map()", () => {
		const cs = new sources.CompatSource(richSourceLike);
		for (let i = 0; i < 500; i++) cs.map({});
	});

	bench.add("compat-source: sourceAndMap()", () => {
		const cs = new sources.CompatSource(richSourceLike);
		for (let i = 0; i < 500; i++) cs.sourceAndMap({});
	});

	bench.add("compat-source: updateHash() (delegated)", () => {
		const cs = new sources.CompatSource(richSourceLike);
		for (let i = 0; i < 20; i++) cs.updateHash(createHash("sha256"));
	});

	bench.add("compat-source: updateHash() (fallback)", () => {
		const cs = new sources.CompatSource({ source: () => fixtureCode });
		for (let i = 0; i < 20; i++) cs.updateHash(createHash("sha256"));
	});

	bench.add("compat-source: wraps OriginalSource", () => {
		for (let i = 0; i < 20; i++) {
			const cs = new sources.CompatSource(
				new sources.OriginalSource(fixtureCode, "fix.js"),
			);
			cs.source();
			cs.buffer();
			cs.size();
			cs.map({});
		}
	});
}
