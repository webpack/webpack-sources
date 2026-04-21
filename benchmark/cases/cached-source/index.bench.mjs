/*
 * cached-source
 *
 * Two axes matter for CachedSource: cold vs warm (first call vs repeat call
 * on the same instance), and the cache-data round-trip that lets webpack
 * store cached state to disk via getCachedData() / re-hydrate.
 */

import { createHash } from "crypto";
import sources from "../../../lib/index.js";
import { fixtureCode, fixtureMap, noop } from "../../fixtures.mjs";

/**
 * A CachedSource with all the common caches already populated. Reused
 * across tasks that explicitly measure the warm path.
 */
const warmed = (() => {
	const cached = new sources.CachedSource(
		new sources.SourceMapSource(fixtureCode, "fixture.js", fixtureMap),
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
export default function register(bench) {
	bench.add("cached-source: new CachedSource()", () => {
		for (let i = 0; i < 100; i++) {
			new sources.CachedSource(new sources.RawSource(fixtureCode));
		}
	});

	bench.add("cached-source: source() (cold)", () => {
		for (let i = 0; i < 50; i++) {
			new sources.CachedSource(new sources.RawSource(fixtureCode)).source();
		}
	});

	bench.add("cached-source: source() (cached)", () => {
		for (let i = 0; i < 500; i++) warmed.source();
	});

	bench.add("cached-source: buffer() (cached)", () => {
		for (let i = 0; i < 500; i++) warmed.buffer();
	});

	bench.add("cached-source: size() (cached)", () => {
		for (let i = 0; i < 500; i++) warmed.size();
	});

	bench.add("cached-source: map() (cold SourceMapSource)", () => {
		for (let i = 0; i < 10; i++) {
			new sources.CachedSource(
				new sources.SourceMapSource(fixtureCode, "fixture.js", fixtureMap),
			).map({});
		}
	});

	bench.add("cached-source: map() (cached)", () => {
		for (let i = 0; i < 500; i++) warmed.map({});
	});

	bench.add("cached-source: sourceAndMap() (cold)", () => {
		for (let i = 0; i < 10; i++) {
			new sources.CachedSource(
				new sources.OriginalSource(fixtureCode, "fixture.js"),
			).sourceAndMap({});
		}
	});

	bench.add("cached-source: sourceAndMap() (cached)", () => {
		for (let i = 0; i < 500; i++) warmed.sourceAndMap({});
	});

	bench.add("cached-source: streamChunks() (cold)", () => {
		for (let i = 0; i < 5; i++) {
			new sources.CachedSource(
				new sources.OriginalSource(fixtureCode, "fixture.js"),
			).streamChunks({}, noop, noop, noop);
		}
	});

	bench.add("cached-source: streamChunks() (warm)", () => {
		for (let i = 0; i < 5; i++) {
			warmed.streamChunks({}, noop, noop, noop);
		}
	});

	bench.add("cached-source: originalLazy()", () => {
		const lazy = new sources.CachedSource(
			() => new sources.RawSource(fixtureCode),
		);
		for (let i = 0; i < 500; i++) lazy.originalLazy();
	});

	bench.add("cached-source: getCachedData() then restore", () => {
		for (let i = 0; i < 10; i++) {
			const a = new sources.CachedSource(
				new sources.OriginalSource(fixtureCode, "fixture.js"),
			);
			a.source();
			a.map({});
			const data = a.getCachedData();
			new sources.CachedSource(
				new sources.OriginalSource(fixtureCode, "fixture.js"),
				data,
			);
		}
	});

	bench.add("cached-source: updateHash() (warm)", () => {
		for (let i = 0; i < 50; i++) warmed.updateHash(createHash("sha256"));
	});
}
