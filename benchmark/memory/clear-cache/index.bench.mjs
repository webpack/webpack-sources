/*
 * clear-cache (memory mode)
 *
 * tinybench tasks shaped for CodSpeed's memory instrument
 * (`@codspeed/core@5.2.0+`, runner mode `"memory"`).
 *
 * Each task exercises a different code path that clearCache() is meant
 * to release memory on. Under CodSpeed memory mode the instrument
 * captures peak heap, total allocations, and allocation timeline. Under
 * walltime / no-CodSpeed runs the tasks still execute (so the harness
 * shape stays valid) but the numbers are not what you want to look at;
 * use ./snapshot.mjs for ad-hoc developer profiling.
 *
 * Fixture lifetime policy:
 *   - Per-task tops live inside `beforeAll`/`afterAll` so they are GC'd
 *     between tasks. This keeps each task's heap baseline independent
 *     of how many tasks the file exports — adding tasks does not
 *     perturb the existing measurements.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sources from "../../../lib/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, "..", "..", "..", "test", "fixtures");
const fixtureCode = fs.readFileSync(
	path.join(fixtureDir, "es6-promise.js"),
	"utf8",
);
const fixtureMap = JSON.parse(
	fs.readFileSync(path.join(fixtureDir, "es6-promise.map"), "utf8"),
);

const UNIQUE_TASKS = 50;
const SHARED_TASKS = 50;
const SHARED_MODS = 200;

/**
 * Build one warmed CachedSource over a SourceMapSource — the shape webpack
 * leaves on a post-minifier asset at PROCESS_ASSETS_STAGE_DEV_TOOLING.
 *
 * @returns {sources.CachedSource} warmed asset-shaped source
 */
function buildPostMinifierTask() {
	const cs = new sources.CachedSource(
		new sources.SourceMapSource(
			fixtureCode,
			"out.js",
			fixtureMap,
			fixtureCode,
			fixtureMap,
		),
	);
	cs.sourceAndMap({ columns: true });
	return cs;
}

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	// --- Scenario A: unique tasks, no clear. Baseline heap growth. ---
	let uniqueAssets;
	bench.add(
		"clear-cache memory: unique tasks (no clearCache)",
		() => {
			for (let i = 0; i < UNIQUE_TASKS; i++) {
				uniqueAssets[i] = buildPostMinifierTask();
			}
		},
		{
			beforeAll() {
				uniqueAssets = Array.from({ length: UNIQUE_TASKS });
			},
			afterAll() {
				uniqueAssets = undefined;
			},
		},
	);

	// --- Scenario B: unique tasks, clearCache after warming. The
	//     clearCache call drops `_cachedSource` and `_cachedMaps`,
	//     so peak heap should be lower than scenario A. ---
	let clearedAssets;
	bench.add(
		"clear-cache memory: unique tasks (clearCache default)",
		() => {
			for (let i = 0; i < UNIQUE_TASKS; i++) {
				const cs = buildPostMinifierTask();
				cs.clearCache();
				clearedAssets[i] = cs;
			}
		},
		{
			beforeAll() {
				clearedAssets = Array.from({ length: UNIQUE_TASKS });
			},
			afterAll() {
				clearedAssets = undefined;
			},
		},
	);

	// --- Scenario C: webpack-side call shape. Drop maps only, keep
	//     source (downstream plugins still read it). ---
	let mapsOnlyAssets;
	bench.add(
		"clear-cache memory: unique tasks (clearCache mapsOnly)",
		() => {
			for (let i = 0; i < UNIQUE_TASKS; i++) {
				const cs = buildPostMinifierTask();
				cs.clearCache({ mapsOnly: true });
				mapsOnlyAssets[i] = cs;
			}
		},
		{
			beforeAll() {
				mapsOnlyAssets = Array.from({ length: UNIQUE_TASKS });
			},
			afterAll() {
				mapsOnlyAssets = undefined;
			},
		},
	);

	// --- Scenario D: shared modules across chunks (the dedup case).
	//     Allocations happen during the clearCache walk itself: a
	//     WeakSet visited per top vs one shared WeakSet across tops. ---
	/** @type {sources.CachedSource[]} */
	let sharedTops;
	const setupShared = () => {
		const moduleCaches = [];
		for (let i = 0; i < SHARED_MODS; i++) {
			const m = new sources.CachedSource(
				new sources.SourceMapSource(fixtureCode, `mod-${i}.js`, fixtureMap),
			);
			m.source();
			m.map();
			moduleCaches.push(m);
		}
		const tops = [];
		for (let i = 0; i < SHARED_TASKS; i++) {
			tops.push(
				new sources.CachedSource(new sources.ConcatSource(...moduleCaches)),
			);
		}
		return tops;
	};

	bench.add(
		"clear-cache memory: shared modules (no visited set — allocates per chunk)",
		() => {
			for (const t of sharedTops) t.clearCache();
		},
		{
			beforeAll() {
				sharedTops = setupShared();
			},
			afterAll() {
				sharedTops = undefined;
			},
		},
	);

	bench.add(
		"clear-cache memory: shared modules (visited set — single allocation)",
		() => {
			const visited = new WeakSet();
			for (const t of sharedTops) t.clearCache(undefined, visited);
		},
		{
			beforeAll() {
				sharedTops = setupShared();
			},
			afterAll() {
				sharedTops = undefined;
			},
		},
	);
}
