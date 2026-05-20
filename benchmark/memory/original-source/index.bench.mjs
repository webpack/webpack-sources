/*
 * original-source (memory mode)
 *
 * OriginalSource is cheap to construct but `map()` walks the source
 * via streamChunks, allocating one mapping segment per line / token.
 * The columns:true path is the heavy one — it tokenises every line.
 */

import sources from "../../../lib/index.js";
import { fixtureCode } from "../../fixtures.mjs";

const BATCH = 30;

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	let sink;
	bench.add(
		"original-source memory: new OriginalSource()",
		() => {
			for (let i = 0; i < BATCH; i++) {
				sink[i] = new sources.OriginalSource(fixtureCode, `f-${i}.js`);
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
		"original-source memory: map({ columns: true }) builds full mappings",
		() => {
			for (let i = 0; i < BATCH; i++) {
				const os = new sources.OriginalSource(fixtureCode, `f-${i}.js`);
				os.map({ columns: true });
				sink[i] = os;
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
		"original-source memory: map({ columns: false }) line-only mappings",
		() => {
			for (let i = 0; i < BATCH; i++) {
				const os = new sources.OriginalSource(fixtureCode, `f-${i}.js`);
				os.map({ columns: false });
				sink[i] = os;
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
		"original-source memory: sourceAndMap({ columns: true })",
		() => {
			for (let i = 0; i < BATCH; i++) {
				const os = new sources.OriginalSource(fixtureCode, `f-${i}.js`);
				os.sourceAndMap({ columns: true });
				sink[i] = os;
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
