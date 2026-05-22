/*
 * prefix-source (memory mode)
 *
 * PrefixSource's hot allocation is `buildPrefixed`: a regex-driven
 * string rewrite that inserts the prefix after every newline. The
 * resulting string is proportional to inner.source().length plus
 * prefix * lineCount.
 */

import sources from "../../../lib/index.js";
import { fixtureCode } from "../../fixtures.mjs";

const BATCH = 30;
const PREFIX = "\t";

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	let sink;
	bench.add(
		"prefix-source memory: new PrefixSource()",
		() => {
			for (let i = 0; i < BATCH; i++) {
				sink[i] = new sources.PrefixSource(
					PREFIX,
					new sources.OriginalSource(fixtureCode, `f-${i}.js`),
				);
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
		"prefix-source memory: source() allocates rewritten string",
		() => {
			for (let i = 0; i < BATCH; i++) {
				const ps = new sources.PrefixSource(
					PREFIX,
					new sources.OriginalSource(fixtureCode, `f-${i}.js`),
				);
				ps.source();
				sink[i] = ps;
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
		"prefix-source memory: buffer() converts rewritten string",
		() => {
			for (let i = 0; i < BATCH; i++) {
				const ps = new sources.PrefixSource(
					PREFIX,
					new sources.OriginalSource(fixtureCode, `f-${i}.js`),
				);
				ps.buffer();
				sink[i] = ps;
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
