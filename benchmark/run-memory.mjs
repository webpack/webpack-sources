#!/usr/bin/env node
/*
 * Memory benchmark entry point for webpack-sources.
 *
 * Sibling of ./run.mjs that discovers `./memory/<case>/index.bench.mjs`
 * instead of `./cases/<case>/index.bench.mjs`. The withCodSpeed wrapper
 * routes runner mode "memory" through the same `@codspeed/core`
 * `setupCore()` / `InstrumentHooks.startBenchmark()` hooks as
 * "simulation"; the difference is in what the CodSpeed agent records
 * (peak heap, total allocations, allocation timeline vs. instruction
 * counts).
 *
 * Locally (no CodSpeed env vars set) the wrapper degrades to plain
 * tinybench wall-clock measurements — useful for "does the bench
 * compile and run" smoke testing, not for memory numbers. Use
 * ./memory/<case>/snapshot.mjs (run with `node --expose-gc`) when you
 * want detailed heap / RSS snapshots from a developer machine.
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { Bench, hrtimeNow } from "tinybench";
import { withCodSpeed } from "./with-codspeed.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const casesPath = path.join(__dirname, "memory");

const filter = process.env.BENCH_FILTER || process.argv[2] || "";

const bench = withCodSpeed(
	new Bench({
		name: "webpack-sources-memory",
		now: hrtimeNow,
		throws: true,
		warmup: true,
		// Memory measurement does not benefit from the same JIT warmup the
		// CPU benchmarks need; the allocator pattern is what we care
		// about. Keep warmup minimal to avoid double-counting allocations.
		warmupIterations: 2,
		iterations: 3,
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
			? `No memory benchmark cases matched filter "${filter}"`
			: "No memory benchmark cases found",
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
	const mod = await import(pathToFileURL(benchFile).href);
	if (typeof mod.default !== "function") {
		throw new Error(
			`memory/${caseName}/index.bench.mjs must export a default function`,
		);
	}
	await mod.default(bench, {
		caseName,
		caseDir: path.join(casesPath, caseName),
		fixtureDir: path.join(casesPath, caseName, "fixture"),
	});
	console.log(`Registered: ${caseName}`);
}

console.log(`\nRunning ${bench.tasks.length} tasks...\n`);
await bench.run();

const rows = bench.tasks.map((task) => {
	const r = task.result;
	if (!r) return { name: task.name, status: "no result" };
	const lat = r.latency;
	return {
		name: task.name,
		"mean (ms)": lat?.mean?.toFixed(4) ?? "n/a",
		"p99 (ms)": lat?.p99?.toFixed(4) ?? "n/a",
		samples: lat?.samplesCount ?? 0,
	};
});
console.log();
console.table(rows);
console.log(
	"\nNote: latency table above is wall-clock only. Memory metrics " +
		"(peak heap, allocations) are recorded by CodSpeed when running under " +
		'CodSpeedHQ/action with mode: "memory".',
);

const failed = bench.tasks.filter((t) => t.result?.error);
if (failed.length > 0) {
	console.error(`\n${failed.length} task(s) errored:`);
	for (const t of failed) {
		console.error(`  - ${t.name}: ${t.result?.error?.message}`);
	}
	process.exit(1);
}
