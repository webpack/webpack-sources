/*
 * cached-source
 *
 * Two axes matter for CachedSource: cold vs warm (first call vs repeat call
 * on the same instance), and the cache-data round-trip that lets webpack
 * store cached state to disk via getCachedData() / re-hydrate.
 *
 * Fixture lifetime policy:
 *   - Heavy fixtures (`warmed`, `warmedConcat`, `sink`) live inside
 *     beforeAll/afterAll hooks so they are GC'd between tasks. This keeps
 *     the V8 heap layout independent of how many tasks the file exports —
 *     adding a new task does not perturb pre-existing tasks' measurements.
 *   - Light fixtures (fixtureCode, fixtureMap) stay at module scope; they
 *     are immutable and cheap to retain.
 */

import { createHash } from "crypto";
import sources from "../../../lib/index.js";
import { fixtureCode, fixtureMap, noop } from "../../fixtures.mjs";

const CONSTRUCT_BATCH = 100;

/**
 * @returns {CachedSource} warmed CachedSource with all common caches populated
 */
function makeWarmed() {
	const cached = new sources.CachedSource(
		new sources.SourceMapSource(fixtureCode, "fixture.js", fixtureMap),
	);
	cached.source();
	cached.map({});
	cached.sourceAndMap({});
	cached.buffer();
	cached.size();
	return cached;
}

/**
 * @returns {CachedSource} CachedSource wrapping a ConcatSource of 10 RawSources,
 * with buffers() already populated
 */
function makeWarmedConcat() {
	const parts = [];
	for (let i = 0; i < 10; i++) parts.push(new sources.RawSource(fixtureCode));
	const cached = new sources.CachedSource(new sources.ConcatSource(...parts));
	cached.buffers();
	return cached;
}

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	/** @type {unknown[] | undefined} */
	let sink;
	bench.add(
		"cached-source: new CachedSource()",
		() => {
			const arr = /** @type {unknown[]} */ (sink);
			for (let i = 0; i < CONSTRUCT_BATCH; i++) {
				arr[i] = new sources.CachedSource(new sources.RawSource(fixtureCode));
			}
		},
		{
			beforeAll() {
				sink = Array.from({ length: CONSTRUCT_BATCH });
			},
			afterAll() {
				sink = undefined;
			},
		},
	);

	bench.add("cached-source: source() (cold)", () => {
		for (let i = 0; i < 50; i++) {
			new sources.CachedSource(new sources.RawSource(fixtureCode)).source();
		}
	});

	/** @type {CachedSource | undefined} */
	let warmed;
	const warmedHooks = {
		beforeAll() {
			warmed = makeWarmed();
		},
		afterAll() {
			warmed = undefined;
		},
	};

	bench.add(
		"cached-source: source() (cached)",
		() => {
			const cs = /** @type {CachedSource} */ (warmed);
			for (let i = 0; i < 500; i++) cs.source();
		},
		warmedHooks,
	);

	bench.add(
		"cached-source: buffer() (cached)",
		() => {
			const cs = /** @type {CachedSource} */ (warmed);
			for (let i = 0; i < 500; i++) cs.buffer();
		},
		warmedHooks,
	);

	bench.add(
		"cached-source: buffers() (cached)",
		() => {
			const cs = /** @type {CachedSource} */ (warmed);
			for (let i = 0; i < 500; i++) cs.buffers();
		},
		warmedHooks,
	);

	bench.add("cached-source: buffer() (cold, wraps ConcatSource x10)", () => {
		for (let i = 0; i < 10; i++) {
			const parts = [];
			for (let j = 0; j < 10; j++) {
				parts.push(new sources.RawSource(fixtureCode));
			}
			new sources.CachedSource(new sources.ConcatSource(...parts)).buffer();
		}
	});

	bench.add("cached-source: buffers() (cold, wraps ConcatSource x10)", () => {
		for (let i = 0; i < 10; i++) {
			const parts = [];
			for (let j = 0; j < 10; j++) {
				parts.push(new sources.RawSource(fixtureCode));
			}
			new sources.CachedSource(new sources.ConcatSource(...parts)).buffers();
		}
	});

	/** @type {CachedSource | undefined} */
	let warmedConcat;
	const warmedConcatHooks = {
		beforeAll() {
			warmedConcat = makeWarmedConcat();
		},
		afterAll() {
			warmedConcat = undefined;
		},
	};

	bench.add(
		"cached-source: buffer() (warm, wraps ConcatSource x10)",
		() => {
			const cs = /** @type {CachedSource} */ (warmedConcat);
			for (let i = 0; i < 500; i++) cs.buffer();
		},
		warmedConcatHooks,
	);

	bench.add(
		"cached-source: buffers() (warm, wraps ConcatSource x10)",
		() => {
			const cs = /** @type {CachedSource} */ (warmedConcat);
			for (let i = 0; i < 500; i++) cs.buffers();
		},
		warmedConcatHooks,
	);

	bench.add(
		"cached-source: size() (cached)",
		() => {
			const cs = /** @type {CachedSource} */ (warmed);
			for (let i = 0; i < 500; i++) cs.size();
		},
		warmedHooks,
	);

	bench.add("cached-source: map() (cold SourceMapSource)", () => {
		for (let i = 0; i < 10; i++) {
			new sources.CachedSource(
				new sources.SourceMapSource(fixtureCode, "fixture.js", fixtureMap),
			).map({});
		}
	});

	bench.add(
		"cached-source: map() (cached)",
		() => {
			const cs = /** @type {CachedSource} */ (warmed);
			for (let i = 0; i < 500; i++) cs.map({});
		},
		warmedHooks,
	);

	bench.add("cached-source: sourceAndMap() (cold)", () => {
		for (let i = 0; i < 10; i++) {
			new sources.CachedSource(
				new sources.OriginalSource(fixtureCode, "fixture.js"),
			).sourceAndMap({});
		}
	});

	bench.add(
		"cached-source: sourceAndMap() (cached)",
		() => {
			const cs = /** @type {CachedSource} */ (warmed);
			for (let i = 0; i < 500; i++) cs.sourceAndMap({});
		},
		warmedHooks,
	);

	bench.add("cached-source: streamChunks() (cold)", () => {
		for (let i = 0; i < 5; i++) {
			new sources.CachedSource(
				new sources.OriginalSource(fixtureCode, "fixture.js"),
			).streamChunks({}, noop, noop, noop);
		}
	});

	bench.add(
		"cached-source: streamChunks() (warm)",
		() => {
			const cs = /** @type {CachedSource} */ (warmed);
			for (let i = 0; i < 5; i++) {
				cs.streamChunks({}, noop, noop, noop);
			}
		},
		warmedHooks,
	);

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

	bench.add(
		"cached-source: updateHash() (warm)",
		() => {
			const cs = /** @type {CachedSource} */ (warmed);
			for (let i = 0; i < 50; i++) cs.updateHash(createHash("sha256"));
		},
		warmedHooks,
	);
}
