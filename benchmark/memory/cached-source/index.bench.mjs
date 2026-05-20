/*
 * cached-source (memory mode)
 *
 * CachedSource's whole purpose is to retain caches. The relevant
 * allocation patterns:
 *   - cold sourceAndMap() — populates `_cachedSource`, `_cachedBuffer`,
 *     `_cachedMaps`; allocates the most per call
 *   - warm sourceAndMap() — returns existing references; near-zero alloc
 *   - getCachedData() — allocates the serialized BufferedMap shape used
 *     by webpack's persistent cache (Buffer.from on every map field)
 */

import sources from "../../../lib/index.js";
import { fixtureCode, fixtureMap } from "../../fixtures.mjs";

const BATCH = 30;

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	let sink;

	bench.add(
		"cached-source memory: cold sourceAndMap() populates all caches",
		() => {
			for (let i = 0; i < BATCH; i++) {
				const cs = new sources.CachedSource(
					new sources.SourceMapSource(fixtureCode, "out.js", fixtureMap),
				);
				cs.sourceAndMap({ columns: true });
				sink[i] = cs;
			}
		},
		{
			beforeAll() {
				sink = Array.from({ length: BATCH });
			},
			afterAll() {
				sink = undefined;
			},
		},
	);

	let warmCaches;
	bench.add(
		"cached-source memory: warm sourceAndMap() returns cached references",
		() => {
			for (let i = 0; i < BATCH; i++) {
				warmCaches[i].sourceAndMap({ columns: true });
			}
		},
		{
			beforeAll() {
				warmCaches = Array.from({ length: BATCH }, () => {
					const cs = new sources.CachedSource(
						new sources.SourceMapSource(fixtureCode, "out.js", fixtureMap),
					);
					cs.sourceAndMap({ columns: true });
					return cs;
				});
			},
			afterAll() {
				warmCaches = undefined;
			},
		},
	);

	bench.add(
		"cached-source memory: getCachedData() allocates BufferedMap",
		() => {
			for (let i = 0; i < BATCH; i++) {
				const cd = warmCaches[i].getCachedData();
				sink[i] = cd;
			}
		},
		{
			beforeAll() {
				sink = Array.from({ length: BATCH });
				warmCaches = Array.from({ length: BATCH }, () => {
					const cs = new sources.CachedSource(
						new sources.SourceMapSource(fixtureCode, "out.js", fixtureMap),
					);
					cs.sourceAndMap({ columns: true });
					return cs;
				});
			},
			afterAll() {
				sink = undefined;
				warmCaches = undefined;
			},
		},
	);

	bench.add(
		"cached-source memory: construct from cachedData (no warm-up)",
		() => {
			// Pre-built cachedData reused across iterations; we measure only
			// the constructor side. Webpack hits this path when restoring
			// from persistent cache.
			const seed = warmCaches[0].getCachedData();
			for (let i = 0; i < BATCH; i++) {
				sink[i] = new sources.CachedSource(
					new sources.SourceMapSource(fixtureCode, "out.js", fixtureMap),
					seed,
				);
			}
		},
		{
			beforeAll() {
				sink = Array.from({ length: BATCH });
				warmCaches = [
					(() => {
						const cs = new sources.CachedSource(
							new sources.SourceMapSource(fixtureCode, "out.js", fixtureMap),
						);
						cs.sourceAndMap({ columns: true });
						return cs;
					})(),
				];
			},
			afterAll() {
				sink = undefined;
				warmCaches = undefined;
			},
		},
	);
}
