/*
 * webpack-20961 (memory mode)
 *
 * Reproduces the asset shape from webpack/webpack#20961 (the issue
 * webpack/webpack#20963 fixes): a build with N chunks, each chunk a
 * CachedSource over a ConcatSource of M shared modules, with the
 * SourceMapDevToolPlugin sequence applied (sourceAndMap warmed so
 * the chunk's `_cachedSource` and `_cachedMaps` are populated).
 *
 * The issue scenario:
 *   - 5,275 unique modules across 52 locale-variant chunks
 *   - SourceMapDevToolPlugin with separate `.map` files
 *   - Production mode
 *
 * PR #20963 reports peak-heap drop from 1422 MB → 1041 MB (-27%)
 * with the addition of `source.clearCache({ maps: true, source:
 * false, parsedMap: true })` after extracting source + map for
 * each chunk. We measure that same call shape here so any
 * webpack-sources change that perturbs the per-chunk memory
 * footprint surfaces in the CodSpeed memory dashboard immediately.
 *
 * Dimensions kept much smaller than webpack's reported run so the
 * Valgrind-instrumented memory pass finishes in reasonable CI time:
 * 10 chunks × 20 shared modules. The relative delta between the
 * tasks is what matters, not the absolute heap.
 */

import sources from "../../../lib/index.js";
import { fixtureCode, fixtureMap } from "../../fixtures.mjs";

const CHUNKS = 10;
const MODULES_PER_CHUNK = 20;

/**
 * Build the shared module pool once per beforeAll. Each module is a
 * warmed CachedSource over a SourceMapSource — the post-loader shape.
 *
 * @returns {sources.CachedSource[]} warmed shared module sources
 */
function buildModulePool() {
	const pool = [];
	for (let i = 0; i < MODULES_PER_CHUNK; i++) {
		const m = new sources.CachedSource(
			new sources.SourceMapSource(fixtureCode, `mod-${i}.js`, fixtureMap),
		);
		m.source();
		m.map();
		pool.push(m);
	}
	return pool;
}

/**
 * Build one chunk-level asset: a CachedSource over a ConcatSource of
 * shared modules. After sourceAndMap, `_cachedSource` holds the
 * bundle string and `_cachedMaps[{}]` holds the composed map — the
 * shape webpack assets present at PROCESS_ASSETS_STAGE_DEV_TOOLING.
 *
 * @param {sources.CachedSource[]} modulePool shared modules
 * @returns {sources.CachedSource} warmed asset-shaped source
 */
function buildChunkAsset(modulePool) {
	const cs = new sources.CachedSource(new sources.ConcatSource(...modulePool));
	cs.sourceAndMap({ columns: true });
	return cs;
}

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	let modulePool;
	let sink;

	bench.add(
		"webpack-20961: warm CHUNKS × MODULES, hold all live (baseline)",
		() => {
			for (let i = 0; i < CHUNKS; i++) {
				sink[i] = buildChunkAsset(modulePool);
			}
		},
		{
			beforeAll() {
				modulePool = buildModulePool();
				sink = Array.from({ length: CHUNKS });
			},
			afterAll() {
				modulePool = undefined;
				sink = undefined;
			},
		},
	);

	bench.add(
		"webpack-20961: warm + clearCache({maps,source:false,parsedMap}) per chunk (PR #20963)",
		() => {
			const visited = new WeakSet();
			for (let i = 0; i < CHUNKS; i++) {
				const cs = buildChunkAsset(modulePool);
				// Webpack's call site after extracting source + map.
				// `source: false` keeps the bundle string available for
				// downstream plugins (Terser/compression/hashing). `maps:
				// true` drops the composed sourcemap. `parsedMap: true`
				// drops the parsed object form on every nested
				// SourceMapSource — the heaviest cached representation,
				// recoverable from the buffer form on re-read.
				cs.clearCache({ maps: true, source: false, parsedMap: true }, visited);
				sink[i] = cs;
			}
		},
		{
			beforeAll() {
				modulePool = buildModulePool();
				sink = Array.from({ length: CHUNKS });
			},
			afterAll() {
				modulePool = undefined;
				sink = undefined;
			},
		},
	);

	bench.add(
		"webpack-20961: warm + full clearCache() per chunk (most aggressive)",
		() => {
			const visited = new WeakSet();
			for (let i = 0; i < CHUNKS; i++) {
				const cs = buildChunkAsset(modulePool);
				// Drops source + maps; downstream plugins would have to
				// re-walk the underlying source. Included as the lower
				// bound on per-chunk peak heap.
				cs.clearCache(undefined, visited);
				sink[i] = cs;
			}
		},
		{
			beforeAll() {
				modulePool = buildModulePool();
				sink = Array.from({ length: CHUNKS });
			},
			afterAll() {
				modulePool = undefined;
				sink = undefined;
			},
		},
	);
}
