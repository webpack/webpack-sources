/*
 * replace-source (memory mode)
 *
 * ReplaceSource holds the inner Source plus an array of Replacement
 * objects. source() concatenates the result string; map() runs the
 * binary-search slice over the inner mappings. Both allocate
 * proportional to the replacement count.
 */

import sources from "../../../lib/index.js";
import { fixtureCode, fixtureMap } from "../../fixtures.mjs";

// Bumped from 20 -> 100. ReplaceSource constructor itself is small; we
// keep REPLACEMENTS at 100 so each iteration still does enough work
// inside the streamChunks loop to dominate over per-iteration overhead.
const BATCH = 100;
const REPLACEMENTS = 100;

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	let sink;
	const buildReplaced = () => {
		const rs = new sources.ReplaceSource(
			new sources.SourceMapSource(fixtureCode, "out.js", fixtureMap),
		);
		// Spread replacements across the source so map() actually exercises
		// the bsearch path rather than degenerating.
		const step = Math.floor(fixtureCode.length / (REPLACEMENTS + 1));
		for (let j = 1; j <= REPLACEMENTS; j++) {
			const pos = j * step;
			rs.insert(pos, `/*r${j}*/`);
		}
		return rs;
	};

	bench.add(
		"replace-source memory: construct + 100 insertions",
		() => {
			for (let i = 0; i < BATCH; i++) sink[i] = buildReplaced();
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

	bench.add(
		"replace-source memory: source() concatenates result",
		() => {
			for (let i = 0; i < BATCH; i++) {
				const rs = buildReplaced();
				rs.source();
				sink[i] = rs;
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

	bench.add(
		"replace-source memory: map({ columns: true }) splices mappings",
		() => {
			for (let i = 0; i < BATCH; i++) {
				const rs = buildReplaced();
				rs.map({ columns: true });
				sink[i] = rs;
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
}
