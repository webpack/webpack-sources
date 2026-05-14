/*
 * Memory + dedup benchmark for clearCache().
 *
 * Mirrors the scenarios from webpack issue #20961:
 *
 *   1. UNIQUE tasks (no shared modules) — each chunk gets its own composed
 *      map. clearCache reduces peak heap by ~45% in this setup.
 *
 *   2. SHARED modules across chunks — the actual webpack shape that the
 *      review of #221 flagged. The same module-level `CachedSource` is
 *      reachable from N chunks. Without `visited` dedup, calling
 *      `clearCache()` per chunk re-walks the shared subtree N times and
 *      tanks build time (10s → 17-45s in the reviewer's repro). With
 *      `visited` shared across the loop the walk is O(unique nodes).
 *
 * Run with:
 *
 *   node --expose-gc benchmark/memory/clear-cache.mjs
 *
 * Use --expose-gc so `globalThis.gc()` is callable; without it the
 * numbers still trend correctly but allocation noise drowns out the
 * delta. Optional env vars:
 *
 *   TASKS=N         number of top-level chunks (default 200)
 *   COPIES=N        modules per chunk (default 8)
 *   SHARED_TASKS=N  chunks for the shared-modules scenario (default 50)
 *   SHARED_MODS=N   distinct shared modules pulled into every chunk
 *                   (default 1000)
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
const SHARED_TASKS = Number(process.env.SHARED_TASKS) || 50;
const SHARED_MODS = Number(process.env.SHARED_MODS) || 1000;

const gc =
	typeof globalThis.gc === "function" ? globalThis.gc : () => undefined;

function fmtMB(bytes) {
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtMs(ms) {
	return `${ms.toFixed(1)} ms`;
}

function snapshot(label) {
	gc();
	gc();
	const m = process.memoryUsage();
	console.log(
		`  ${label.padEnd(32)} rss=${fmtMB(m.rss)} heapUsed=${fmtMB(
			m.heapUsed,
		)} arrayBuffers=${fmtMB(m.arrayBuffers)}`,
	);
	return m;
}

function diffMB(later, earlier) {
	return (later - earlier) / 1024 / 1024;
}

// ------------------------------------------------------------------
// Scenario 1: unique tasks (no shared modules).
// ------------------------------------------------------------------

function buildUniqueTask() {
	const parts = [];
	for (let i = 0; i < COPIES; i++) {
		parts.push(
			new sources.SourceMapSource(fixtureCode, `mod-${i}.js`, fixtureMap),
		);
	}
	return new sources.CachedSource(new sources.ConcatSource(...parts));
}

function warmAndSerialize(cs) {
	const { source, map } = cs.sourceAndMap({ columns: true });
	return {
		source,
		mapString: map === null ? "" : JSON.stringify(map),
	};
}

function runUniqueScenario({ clear }) {
	console.log(
		`\nUNIQUE   ${clear ? "clearCache " : "no clear   "}(${TASKS} tasks, ${COPIES} modules/task)`,
	);
	const before = snapshot("before");
	const tasks = [];
	const out = [];
	for (let i = 0; i < TASKS; i++) {
		const cs = buildUniqueTask();
		out.push(warmAndSerialize(cs));
		if (clear) cs.clearCache();
		tasks.push(cs);
	}
	const peak = snapshot("peak (tasks live)");
	if (tasks.length !== TASKS) throw new Error("unreachable");
	return { before, peak };
}

// ------------------------------------------------------------------
// Scenario 2: shared modules across chunks (the webpack shape).
// ------------------------------------------------------------------

function buildSharedScenario() {
	// One pool of module-level CachedSources, each warmed individually
	// so its `_cachedMaps` has something to clear. Warm-up is per-module
	// (cheap), not per-top (composing a chunk-level map over thousands
	// of modules would OOM and isn't what the dedup benchmark measures).
	const moduleCaches = [];
	for (let i = 0; i < SHARED_MODS; i++) {
		const cs = new sources.CachedSource(
			new sources.SourceMapSource(fixtureCode, `mod-${i}.js`, fixtureMap),
		);
		cs.source();
		cs.map();
		moduleCaches.push(cs);
	}
	// Every top-level chunk pulls in EVERY shared module — extreme but
	// reproduces the reviewer's "10s → 17–45s" pathology cleanly. The
	// tops themselves are NOT warmed: this benchmark measures the cost
	// of the traversal itself.
	const tops = [];
	for (let i = 0; i < SHARED_TASKS; i++) {
		tops.push(
			new sources.CachedSource(new sources.ConcatSource(...moduleCaches)),
		);
	}
	return tops;
}

function timeMs(fn) {
	const start = process.hrtime.bigint();
	fn();
	const end = process.hrtime.bigint();
	return Number(end - start) / 1e6;
}

function runSharedScenario(mode, prebuiltTops) {
	const tops = prebuiltTops;

	let label;
	let elapsedMs;
	if (mode === "no-clear") {
		label = "no clear";
		elapsedMs = 0;
	} else if (mode === "naive") {
		label = "clearCache() (no visited)";
		elapsedMs = timeMs(() => {
			for (const t of tops) t.clearCache();
		});
	} else if (mode === "dedup") {
		label = "clearCache(opts, visited)";
		elapsedMs = timeMs(() => {
			const visited = new WeakSet();
			for (const t of tops) t.clearCache({ recursive: true }, visited);
		});
	} else if (mode === "non-recursive") {
		label = "clearCache({ recursive: false })";
		elapsedMs = timeMs(() => {
			for (const t of tops) t.clearCache({ recursive: false });
		});
	}

	console.log(`  ${label.padEnd(34)} ${fmtMs(elapsedMs)}`);
	return { tops, elapsedMs };
}

// ------------------------------------------------------------------
// Run scenarios.
// ------------------------------------------------------------------

console.log("=== Scenario 1: unique tasks ===");
const u1 = runUniqueScenario({ clear: false });
const u2 = runUniqueScenario({ clear: true });
const baselineDelta = diffMB(u1.peak.heapUsed, u1.before.heapUsed);
const clearedDelta = diffMB(u2.peak.heapUsed, u2.before.heapUsed);
const savings = baselineDelta - clearedDelta;
const pct = (savings / baselineDelta) * 100;
console.log("\nunique-tasks summary");
console.log(`  heap growth (baseline)     ${baselineDelta.toFixed(1)} MB`);
console.log(`  heap growth (clearCache)   ${clearedDelta.toFixed(1)} MB`);
console.log(
	`  savings                    ${savings.toFixed(1)} MB (${pct.toFixed(1)}%)`,
);

console.log(
	`\n=== Scenario 2: shared modules (${SHARED_TASKS} chunks × ${SHARED_MODS} shared) ===`,
);
const sharedTops = buildSharedScenario();
runSharedScenario("no-clear", sharedTops);
const naive = runSharedScenario("naive", sharedTops);
const dedup = runSharedScenario("dedup", sharedTops);
const nonRec = runSharedScenario("non-recursive", sharedTops);

console.log("\nshared-modules summary");
console.log(
	`  naive vs dedup            ${(naive.elapsedMs / dedup.elapsedMs).toFixed(1)}× speedup with visited set`,
);
console.log(
	`  naive vs non-recursive    ${(naive.elapsedMs / nonRec.elapsedMs).toFixed(1)}× speedup with recursive=false`,
);

if (savings <= 0) {
	console.error(
		"\nclearCache() did NOT reduce peak heap; investigate before landing.",
	);
	process.exitCode = 1;
}
