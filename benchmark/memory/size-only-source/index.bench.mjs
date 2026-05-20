/*
 * size-only-source (memory mode)
 *
 * SizeOnlySource is the lightest Source: one number and a few throw
 * paths. Included for completeness so the dashboard tracks any
 * accidental growth (a new field on a Source so commonly allocated
 * would show up here first).
 */

import sources from "../../../lib/index.js";

const BATCH = 200;

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	let sink;
	bench.add(
		"size-only-source memory: new SizeOnlySource()",
		() => {
			for (let i = 0; i < BATCH; i++) {
				sink[i] = new sources.SizeOnlySource(1024);
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
