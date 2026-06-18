/*
 * Shared warmup module.
 *
 * Tinybench runs every micro-benchmark in one Node process. The first
 * bench to touch a given Source class / regex / map parser is charged
 * the one-time cost: lazy regex compilation, V8 hidden-class transitions
 * (PACKED -> HOLEY promotion paths, monomorphic -> polymorphic IC), the
 * fixture-map JSON parse, the dual-string-buffer Buffer.from() call,
 * and so on. A code change that shifts WHICH bench runs first will then
 * appear as a phantom regression on whatever bench used to inherit the
 * cost.
 *
 * This module exercises every Source type and every accessor at least
 * twice each (so the IC is monomorphic by the time the suite starts).
 * Run it once before `bench.run()` and the per-benchmark numbers
 * measure only the bench's incremental work.
 *
 * Keep this in sync with `lib/index.js` exports: any new public Source
 * type should be added here.
 */

import sources from "../lib/index.js";
import { fixtureCode, fixtureMap } from "./fixtures.mjs";

const NAME = "warmup.js";

/* Some accessors throw on certain Source types (e.g. SizeOnlySource
 * throws on source()/buffer()); we swallow those because warmup only
 * cares about the side effects (compiled regexes, monomorphic ICs). */
const swallow = () => {};

/**
 * Touch every accessor twice on `src`. The second call exposes any
 * cache shape that only stabilises after the first read.
 * @param {InstanceType<typeof sources.Source>} src source
 * @returns {void}
 */
function touchAccessors(src) {
	for (let i = 0; i < 2; i++) {
		try {
			src.source();
		} catch {
			swallow();
		}
		try {
			src.buffer();
		} catch {
			swallow();
		}
		try {
			src.size();
		} catch {
			swallow();
		}
		if (typeof src.buffers === "function") {
			try {
				src.buffers();
			} catch {
				swallow();
			}
		}
		try {
			src.map({ columns: true });
		} catch {
			swallow();
		}
		try {
			src.map({ columns: false });
		} catch {
			swallow();
		}
		try {
			src.sourceAndMap({ columns: true });
		} catch {
			swallow();
		}
		try {
			src.streamChunks(
				{},
				() => {},
				() => {},
				() => {},
			);
		} catch {
			swallow();
		}
	}
}

/**
 * Run the warmup. Idempotent; safe to call multiple times. Discards
 * all results — only the side effects (compiled regexes, monomorphic
 * ICs) matter.
 * @returns {void}
 */
export function warmupSources() {
	// Each Source type, both string and buffer forms so dual-string-buffer
	// caching is exercised in both directions.
	const original = new sources.OriginalSource(fixtureCode, NAME);
	const originalBuf = new sources.OriginalSource(
		Buffer.from(fixtureCode),
		NAME,
	);
	const raw = new sources.RawSource(fixtureCode);
	const rawBuf = new sources.RawSource(Buffer.from(fixtureCode));
	const sizeOnly = new sources.SizeOnlySource(fixtureCode.length);
	const sourceMap = new sources.SourceMapSource(fixtureCode, NAME, fixtureMap);
	const prefix = new sources.PrefixSource("\t", original);
	const concat = new sources.ConcatSource(original, raw);

	// ReplaceSource needs at least one replacement to exercise its real
	// streamChunks path (the no-replacement fast path bypasses checkContent).
	const replace = new sources.ReplaceSource(original);
	replace.replace(0, 4, "v", "value");

	// CachedSource needs a warm cache to exercise getCachedData.
	const cached = new sources.CachedSource(
		new sources.SourceMapSource(fixtureCode, NAME, fixtureMap),
	);
	cached.sourceAndMap({ columns: true });

	// CompatSource wraps a SourceLike (plain object). Touching it exercises
	// the source-shape detection path.
	const compat = sources.CompatSource.from({
		source: () => fixtureCode,
		map: () => fixtureMap,
	});

	for (const src of [
		original,
		originalBuf,
		raw,
		rawBuf,
		sizeOnly,
		sourceMap,
		prefix,
		concat,
		replace,
		cached,
		compat,
	]) {
		touchAccessors(src);
	}

	// Also pre-warm getCachedData() and the BufferedMap serialisation path
	// — it's the heaviest one-time allocation in the suite.
	try {
		cached.getCachedData();
	} catch {
		swallow();
	}
}
