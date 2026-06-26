#!/usr/bin/env node
/*
 * Unified benchmark entry point for webpack-sources.
 *
 * Modes:
 *   - "cases"  (default): discovers `./cases/<name>/index.bench.mjs`,
 *     measures wall-clock latency / throughput. Under CodSpeedHQ/action
 *     the wrapper records CPU instructions ("simulation" mode).
 *   - "memory": discovers `./memory/<name>/index.bench.mjs`. Locally the
 *     latency table is wall-clock smoke testing only — actual memory
 *     numbers (peak heap, allocations) come from CodSpeedHQ/action with
 *     mode: "memory".
 *
 * Invocation:
 *   node ./benchmark/run.mjs <mode> [<filter>]
 *
 * Both `npm run benchmark` and `npm run benchmark:memory` pin the mode
 * via the package.json scripts; the user's filter passed via
 * `npm run benchmark -- raw-source` lands as the second positional arg.
 *
 * The bench is wrapped with a local `withCodSpeed()` bridge (ported from
 * webpack / enhanced-resolve) so the same entry point works for:
 *   - local development -> wall-clock measurements printed to the
 *     terminal; the wrapper detects that CodSpeed is not active and
 *     returns the bench untouched
 *   - CI under CodSpeedHQ/action -> the wrapper switches to
 *     instrumentation mode automatically and results are uploaded to
 *     codspeed.io
 *
 * See ./README.md for the layout of individual cases.
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { Bench, hrtimeNow } from "tinybench";
import { withCodSpeed } from "./with-codspeed.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Per-mode runner configuration. `cases` matches the historical
// `run.mjs`, `memory` matches `run-memory.mjs`.
//
// Warmup-iteration count differs because:
// - cases (CPU/simulation): we want V8 hidden-class caches and the GC
//   heap settled before measurement; under CodSpeed each task is
//   measured in a single instrumented call so residual allocations
//   from previous tasks can otherwise leak into the next.
// - memory: warmup itself allocates, so too many warmup iterations
//   double-count allocations the bench should be measuring. We keep
//   it minimal.
const MODES = {
	cases: {
		name: "webpack-sources",
		dirName: "cases",
		warmupIterations: 10,
		iterations: 10,
		showOpsPerSec: true,
		dumpJson: true,
		trailerNote: "",
		errorPrefix: "",
	},
	memory: {
		name: "webpack-sources-memory",
		dirName: "memory",
		warmupIterations: 2,
		iterations: 3,
		showOpsPerSec: false,
		dumpJson: false,
		trailerNote:
			"\nNote: latency table above is wall-clock only. Memory metrics " +
			"(peak heap, allocations) are recorded by CodSpeed when running under " +
			'CodSpeedHQ/action with mode: "memory".',
		errorPrefix: "memory/",
	},
};

const modeArg = process.argv[2] || "cases";
const mode = MODES[modeArg];
if (!mode) {
	console.error(
		`Unknown mode "${modeArg}". Expected one of: ${Object.keys(MODES).join(", ")}`,
	);
	process.exit(1);
}

const casesPath = path.join(__dirname, mode.dirName);

/**
 * Filter expression from CLI or env (e.g. `npm run benchmark -- RawSource`).
 * A case is included if its directory name contains this substring. Empty
 * means "include everything". Note: modeArg lives at argv[2]; filter at
 * argv[3].
 */
const filter = process.env.BENCH_FILTER || process.argv[3] || "";

const bench = withCodSpeed(
	new Bench({
		name: mode.name,
		now: hrtimeNow,
		throws: true,
		warmup: true,
		warmupIterations: mode.warmupIterations,
		iterations: mode.iterations,
	}),
);

const caseDirs = (await fs.readdir(casesPath, { withFileTypes: true }))
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name)
	.filter((name) => !filter || name.includes(filter))
	.sort();

if (caseDirs.length === 0) {
	console.error(
		filter
			? `No ${mode.dirName} benchmark cases matched filter "${filter}"`
			: `No ${mode.dirName} benchmark cases found`,
	);
	process.exit(1);
}

for (const caseName of caseDirs) {
	const benchFile = path.join(casesPath, caseName, "index.bench.mjs");
	try {
		await fs.access(benchFile);
	} catch {
		console.warn(`[skip] ${caseName}: no index.bench.mjs`);
		continue;
	}
	const benchMod = await import(pathToFileURL(benchFile).href);
	if (typeof benchMod.default !== "function") {
		throw new Error(
			`${mode.errorPrefix}${caseName}/index.bench.mjs must export a default function`,
		);
	}
	await benchMod.default(bench, {
		caseName,
		caseDir: path.join(casesPath, caseName),
		fixtureDir: path.join(casesPath, caseName, "fixture"),
	});
	console.log(`Registered: ${caseName}`);
}

console.log(`\nRunning ${bench.tasks.length} tasks...\n`);
await bench.run();

// Pretty-print results. Kept simple on purpose — CodSpeed uploads its
// own data in CI; this table is for humans running locally.
const rows = bench.tasks.map((task) => {
	const r = task.result;
	if (!r) return { name: task.name, status: "no result" };
	const lat = r.latency;
	const tp = r.throughput;
	const row = {
		name: task.name,
		"mean (ms)": lat?.mean?.toFixed(4) ?? "n/a",
		"p99 (ms)": lat?.p99?.toFixed(4) ?? "n/a",
		samples: lat?.samplesCount ?? 0,
	};
	if (mode.showOpsPerSec) {
		// Insert ops/s and rme up front before mean/p99 to match the
		// historical cases-mode column order.
		return {
			name: row.name,
			"ops/s": tp?.mean?.toFixed(2) ?? "n/a",
			"mean (ms)": row["mean (ms)"],
			"p99 (ms)": row["p99 (ms)"],
			"rme (%)": lat?.rme?.toFixed(2) ?? "n/a",
			samples: row.samples,
		};
	}
	return row;
});

console.table(rows);
if (mode.trailerNote) console.log(mode.trailerNote);

// Optional JSON dump for diff-runner (see benchmark/compare.mjs).
// Memory mode skips this because its latency rows aren't the actual
// signal — see CodSpeed for the real numbers.
if (mode.dumpJson && process.env.BENCH_OUTPUT) {
	const dump = bench.tasks.map((task) => {
		const r = task.result;
		return {
			name: task.name,
			opsPerSec: r?.throughput?.mean ?? 0,
			meanMs: r?.latency?.mean ?? 0,
			p99Ms: r?.latency?.p99 ?? 0,
			rme: r?.latency?.rme ?? 0,
			samples: r?.latency?.samplesCount ?? 0,
		};
	});
	await fs.writeFile(process.env.BENCH_OUTPUT, JSON.stringify(dump, null, 2));
	console.log(`Wrote ${dump.length} rows to ${process.env.BENCH_OUTPUT}`);
}

// Exit non-zero if any task threw, so CI picks it up.
const failed = bench.tasks.filter((t) => t.result?.error);
if (failed.length > 0) {
	console.error(`\n${failed.length} task(s) failed:`);
	for (const t of failed) console.error(`  - ${t.name}: ${t.result.error}`);
	process.exit(1);
}
