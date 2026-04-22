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

/*
 * Reproduces the layering pattern called out in
 * https://github.com/webpack/webpack-sources/issues/157:
 *
 *   CachedSource -> ConcatSource -> CachedSource -> ConcatSource
 *
 * At every ConcatSource boundary, the legacy `buffer()` path calls
 * Buffer.concat on the children's buffers, which copies all of the bytes
 * through each layer. `buffers()` returns Buffer[] without concatenating,
 * so the wrapping CachedSource can pass the chunks through to the consumer
 * (e.g. fs.createWriteStream / writev) without ever materializing a single
 * contiguous Buffer.
 *
 * Each inner chunk is ~5 raw sources of fixtureCode, the outer chunk stitches
 * 4 of them together, mirroring "chunk-of-modules" nesting depth.
 */
/**
 * @returns {CachedSource} cached source
 */
function buildLayeredChunk() {
	const inner = [];
	for (let i = 0; i < 4; i++) {
		const parts = [];
		for (let j = 0; j < 5; j++) {
			parts.push(new sources.RawSource(fixtureCode));
		}
		inner.push(new sources.CachedSource(new sources.ConcatSource(...parts)));
	}
	return new sources.CachedSource(
		new sources.ConcatSource(
			new sources.RawSource("/* outer header */\n"),
			...inner,
			new sources.RawSource("/* outer footer */\n"),
		),
	);
}

const warmLayeredChunk = (() => {
	const chunk = buildLayeredChunk();
	chunk.buffers();
	return chunk;
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

	bench.add(
		"realistic-source-map-pipeline: cold buffer() (Cached->Concat->Cached->Concat)",
		() => {
			buildLayeredChunk().buffer();
		},
	);

	bench.add(
		"realistic-source-map-pipeline: cold buffers() (Cached->Concat->Cached->Concat)",
		() => {
			buildLayeredChunk().buffers();
		},
	);

	bench.add(
		"realistic-source-map-pipeline: warm buffer() (Cached->Concat->Cached->Concat)",
		() => {
			for (let i = 0; i < 50; i++) warmLayeredChunk.buffer();
		},
	);

	bench.add(
		"realistic-source-map-pipeline: warm buffers() (Cached->Concat->Cached->Concat)",
		() => {
			for (let i = 0; i < 50; i++) warmLayeredChunk.buffers();
		},
	);
}
