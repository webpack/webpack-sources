/*
 * Memory benchmark for clearCache().
 *
 * Mirrors the scenario from webpack issue #20961 where
 * `SourceMapDevToolPlugin` accumulates one `CachedSource` (with composed
 * source map) per task in a `tasks[]` array before serializing any of
 * them. With many chunks each task's cached map (mappings + sources +
 * sourcesContent) is retained in `_cachedMaps` until the array is
 * released, which doubles or triples peak RSS.
 *
 * This script compares two strategies for the same workload:
 *
 *   - baseline : keep every CachedSource fully warmed in an array.
 *   - clearCache: same, but call `clearCache()` after extracting the
 *                  serialized map "buffer" each task would emit.
 *
 * Run with:
 *
 *   node --expose-gc benchmark/memory/clear-cache.mjs
 *
 * Use --expose-gc so `globalThis.gc()` is callable; without it the
 * numbers still trend correctly, but allocation noise drowns out the
 * delta. Optional env vars:
 *
 *   TASKS=N      number of tasks (default 200)
 *   COPIES=N     fixture multiplier per task (default 8) — bigger
 *                values better mimic webpack's "compose all module maps
 *                into a chunk map" output
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sources from "../../lib/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, "..", "..", "test", "fixtures");
const fixtureCode = fs.readFileSync(
	path.join(fixtureDir, "es6-promise.js"),
	"utf8",
);
const fixtureMap = JSON.parse(
	fs.readFileSync(path.join(fixtureDir, "es6-promise.map"), "utf8"),
);

const TASKS = Number(process.env.TASKS) || 200;
const COPIES = Number(process.env.COPIES) || 8;

const gc =
	typeof globalThis.gc === "function" ? globalThis.gc : () => undefined;

/**
 * @param bytes
 */
function fmtMB(bytes) {
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * @param label
 */
function snapshot(label) {
	gc();
	gc();
	const m = process.memoryUsage();
	console.log(
		`  ${label.padEnd(28)} rss=${fmtMB(m.rss)} heapUsed=${fmtMB(
			m.heapUsed,
		)} arrayBuffers=${fmtMB(m.arrayBuffers)}`,
	);
	return m;
}

/**
 * Build one CachedSource that wraps a ConcatSource of `COPIES`
 * SourceMapSource entries. Approximates a chunk that pulls in multiple
 * modules each carrying its own source map.
 * @returns {sources.CachedSource} cached source
 */
function buildTaskSource() {
	const parts = [];
	for (let i = 0; i < COPIES; i++) {
		parts.push(
			new sources.SourceMapSource(fixtureCode, `mod-${i}.js`, fixtureMap),
		);
	}
	return new sources.CachedSource(new sources.ConcatSource(...parts));
}

/**
 * Mirror the work `SourceMapDevToolPlugin` Phase 2 does for each task:
 * pull source + map, then serialize the map to JSON (what eventually
 * gets written to the .map file). The parsed map object is no longer
 * useful to the caller after this — but the CachedSource still keeps
 * it alive via `_cachedMaps` unless we explicitly clear.
 * @param {sources.CachedSource} cs cached source
 * @returns {{ source: string, mapString: string }} serialized phase-2 output
 */
function warmAndSerialize(cs) {
	const { source, map } = cs.sourceAndMap({ columns: true });
	return {
		source: /** @type {string} */ (source),
		mapString: map === null ? "" : JSON.stringify(map),
	};
}

/**
 *
 */
function runBaseline() {
	console.log(
		`\nbaseline       (${TASKS} tasks, ${COPIES} modules/task, no clearCache)`,
	);
	const before = snapshot("before");
	const tasks = [];
	const phase2Out = [];
	for (let i = 0; i < TASKS; i++) {
		const cs = buildTaskSource();
		phase2Out.push(warmAndSerialize(cs));
		// Asset stays reachable through the rest of the compilation (size,
		// hash, etc.) — but its parsed map sits in `_cachedMaps` forever.
		tasks.push(cs);
	}
	const peak = snapshot("peak (tasks live)");
	if (tasks.length !== TASKS || phase2Out.length !== TASKS) {
		throw new Error("unreachable");
	}
	return { before, peak };
}

/**
 *
 */
function runWithClearCache() {
	console.log(
		`\nwith clearCache(${TASKS} tasks, ${COPIES} modules/task, clearCache per task)`,
	);
	const before = snapshot("before");
	const tasks = [];
	const phase2Out = [];
	for (let i = 0; i < TASKS; i++) {
		const cs = buildTaskSource();
		phase2Out.push(warmAndSerialize(cs));
		// Phase 2 has serialized the map; the parsed map object retained
		// inside `_cachedMaps` is now dead weight. Drop it.
		cs.clearCache();
		tasks.push(cs);
	}
	const peak = snapshot("peak (tasks live)");
	if (tasks.length !== TASKS || phase2Out.length !== TASKS) {
		throw new Error("unreachable");
	}
	return { before, peak };
}

/**
 * @param later
 * @param earlier
 */
function diffMB(later, earlier) {
	return (later - earlier) / 1024 / 1024;
}

const a = runBaseline();
const b = runWithClearCache();

const baselineDelta = diffMB(a.peak.heapUsed, a.before.heapUsed);
const clearedDelta = diffMB(b.peak.heapUsed, b.before.heapUsed);
const savings = baselineDelta - clearedDelta;
const pct = (savings / baselineDelta) * 100;

console.log("\nsummary");
console.log(`  heap growth (baseline)     ${baselineDelta.toFixed(1)} MB`);
console.log(`  heap growth (clearCache)   ${clearedDelta.toFixed(1)} MB`);
console.log(
	`  savings                    ${savings.toFixed(1)} MB (${pct.toFixed(1)}%)`,
);

if (savings <= 0) {
	console.error(
		"\nclearCache() did NOT reduce peak heap; investigate before landing.",
	);
	process.exitCode = 1;
}
