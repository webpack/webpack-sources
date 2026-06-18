/*
 * concat-source (memory mode)
 *
 * ConcatSource is a thin wrapper that keeps an array of children. The
 * allocation-significant operations are:
 *   - source() — concatenates every child's source() result
 *   - buffers() — allocates a Buffer[] aggregating each child
 *   - map() — composes child maps via streamChunks
 */

import sources from "../../../lib/index.js";
import { fixtureCode, fixtureMap } from "../../fixtures.mjs";

// Bumped from 20 -> 100. ConcatSource constructor allocation scales with
// children but each `new ConcatSource()` itself is small (~80 B), so the
// previous BATCH=20 sat in the noise-amplification band. CHILDREN unchanged.
const BATCH = 100;
const CHILDREN = 20;

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	let sink;
	const buildKids = () => {
		const kids = [];
		for (let i = 0; i < CHILDREN; i++) {
			kids.push(new sources.OriginalSource(fixtureCode, `mod-${i}.js`));
		}
		return kids;
	};

	bench.add(
		"concat-source memory: new ConcatSource(...children)",
		() => {
			for (let i = 0; i < BATCH; i++) {
				sink[i] = new sources.ConcatSource(...buildKids());
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
		"concat-source memory: source() concatenates children",
		() => {
			for (let i = 0; i < BATCH; i++) {
				const cs = new sources.ConcatSource(...buildKids());
				cs.source();
				sink[i] = cs;
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
		"concat-source memory: buffers() builds Buffer[]",
		() => {
			for (let i = 0; i < BATCH; i++) {
				const cs = new sources.ConcatSource(...buildKids());
				cs.buffers();
				sink[i] = cs;
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
		"concat-source memory: map({ columns: true }) composes child maps",
		() => {
			for (let i = 0; i < BATCH; i++) {
				const cs = new sources.ConcatSource(
					new sources.SourceMapSource(fixtureCode, `a-${i}.js`, fixtureMap),
					new sources.SourceMapSource(fixtureCode, `b-${i}.js`, fixtureMap),
				);
				cs.map({ columns: true });
				sink[i] = cs;
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
