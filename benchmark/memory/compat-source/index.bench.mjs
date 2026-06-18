/*
 * compat-source (memory mode)
 *
 * CompatSource is a thin adapter. Two allocation paths matter:
 *   - wrapping a sourceLike that exposes Source methods (delegation,
 *     near-zero overhead)
 *   - the static `from()` shortcut, which returns the wrapped source
 *     directly when it's already a Source instance and otherwise
 *     allocates a wrapper
 */

import sources from "../../../lib/index.js";
import { fixtureCode, fixtureMap } from "../../fixtures.mjs";

// Bumped from 50 -> 500 so each measured iteration allocates >= ~30 KB.
// `new CompatSource(sourceLike)` is a few-field assignment (~20 B/call),
// so smaller batches left CodSpeed measuring at sub-KB scale where
// allocation-count differencing between runner glibc/V8 versions
// amplified into double-digit phantom regressions.
const BATCH = 500;

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	let sink;
	let realSources;

	bench.add(
		"compat-source memory: new CompatSource(sourceLike)",
		() => {
			for (let i = 0; i < BATCH; i++) {
				sink[i] = new sources.CompatSource(realSources[i]);
			}
		},
		{
			beforeAll() {
				sink = Array.from({ length: BATCH });
				realSources = Array.from(
					{ length: BATCH },
					(_, i) => new sources.OriginalSource(fixtureCode, `f-${i}.js`),
				);
			},
			afterAll() {
				sink = undefined;
				realSources = undefined;
			},
		},
	);

	bench.add(
		"compat-source memory: delegated source() + map() through wrapper",
		() => {
			for (let i = 0; i < BATCH; i++) {
				const cs = new sources.CompatSource(realSources[i]);
				cs.source();
				cs.map();
				sink[i] = cs;
			}
		},
		{
			beforeAll() {
				sink = Array.from({ length: BATCH });
				realSources = Array.from(
					{ length: BATCH },
					(_, i) =>
						new sources.SourceMapSource(fixtureCode, `f-${i}.js`, fixtureMap),
				);
			},
			afterAll() {
				sink = undefined;
				realSources = undefined;
			},
		},
	);

	bench.add(
		"compat-source memory: CompatSource.from() short-circuits on Source",
		() => {
			for (let i = 0; i < BATCH; i++) {
				sink[i] = sources.CompatSource.from(realSources[i]);
			}
		},
		{
			beforeAll() {
				sink = Array.from({ length: BATCH });
				realSources = Array.from(
					{ length: BATCH },
					(_, i) => new sources.OriginalSource(fixtureCode, `f-${i}.js`),
				);
			},
			afterAll() {
				sink = undefined;
				realSources = undefined;
			},
		},
	);
}
