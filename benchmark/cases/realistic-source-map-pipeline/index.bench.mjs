/*
 * realistic-source-map-pipeline
 *
 * Mimics a slice of what happens inside webpack's SourceFactory: an
 * OriginalSource is wrapped in a ReplaceSource (per-module patching) and
 * then several of those go through a ConcatSource, finally wrapped in a
 * CachedSource for reuse across compilations. We measure both the cold
 * pipeline (fresh objects, fresh caches) and the warm one (CachedSource
 * reuse across calls).
 *
 * This is the case that most directly reflects "compile one chunk" cost.
 */

import sources from "../../../lib/index.js";
import { fixtureCode, fixtureMap } from "../../fixtures.mjs";

/**
 * @returns {ConcatSource} source
 */
function buildFreshChunk() {
	const parts = [];
	for (let i = 0; i < 4; i++) {
		const orig = new sources.OriginalSource(fixtureCode, `m${i}.js`);
		const replaced = new sources.ReplaceSource(orig);
		replaced.replace(0, 6, "/* h */");
		replaced.insert(100, "// injected\n");
		parts.push(replaced);
	}
	parts.push(
		new sources.SourceMapSource(fixtureCode, "bundled.js", fixtureMap),
	);
	return new sources.ConcatSource(
		new sources.RawSource("/* chunk header */\n"),
		...parts,
		new sources.RawSource("/* chunk footer */\n"),
	);
}

const warmChunk = (() => {
	const cached = new sources.CachedSource(buildFreshChunk());
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
	bench.add(
		"realistic-source-map-pipeline: cold sourceAndMap() (fresh pipeline)",
		() => {
			const chunk = new sources.CachedSource(buildFreshChunk());
			chunk.sourceAndMap({});
		},
	);

	bench.add(
		"realistic-source-map-pipeline: warm sourceAndMap() (reuse CachedSource)",
		() => {
			for (let i = 0; i < 50; i++) warmChunk.sourceAndMap({});
		},
	);

	bench.add("realistic-source-map-pipeline: cold map() only", () => {
		const chunk = new sources.CachedSource(buildFreshChunk());
		chunk.map({});
	});

	bench.add("realistic-source-map-pipeline: cold source() only", () => {
		const chunk = new sources.CachedSource(buildFreshChunk());
		chunk.source();
	});

	bench.add(
		"realistic-source-map-pipeline: serialize through getCachedData()",
		() => {
			const chunk = new sources.CachedSource(buildFreshChunk());
			chunk.source();
			chunk.map({});
			const data = chunk.getCachedData();
			new sources.CachedSource(buildFreshChunk(), data).sourceAndMap({});
		},
	);

	bench.add(
		"realistic-source-map-pipeline: streamChunks() (columns on)",
		() => {
			buildFreshChunk().streamChunks(
				{ columns: true },
				() => {},
				() => {},
				() => {},
			);
		},
	);

	bench.add(
		"realistic-source-map-pipeline: streamChunks() (columns off)",
		() => {
			buildFreshChunk().streamChunks(
				{ columns: false },
				() => {},
				() => {},
				() => {},
			);
		},
	);
}
