/*
 * source-map-source (memory mode)
 *
 * SourceMapSource holds up to four dual-cached pairs (value, sourceMap,
 * originalSource, innerSourceMap) plus parsed object forms. map() and
 * sourceAndMap() allocate normalized maps; the combined-inner-map path
 * is the heaviest.
 */

import sources from "../../../lib/index.js";
import { fixtureCode, fixtureMap } from "../../fixtures.mjs";

// Bumped from 20 -> 100. `new SourceMapSource(simple)` was the BATCH=20
// case CodSpeed flagged at -24.62% on identical-vs-main code; the per-
// iter allocation was small enough that runner-glibc differences in
// the buffer-from path produced a 256 B systematic offset. Per-iter at
// BATCH=100 lifts the signal above that floor.
const BATCH = 100;

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	let sink;
	bench.add(
		"source-map-source memory: new SourceMapSource(simple)",
		() => {
			for (let i = 0; i < BATCH; i++) {
				sink[i] = new sources.SourceMapSource(
					fixtureCode,
					"out.js",
					fixtureMap,
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
		"source-map-source memory: new SourceMapSource(with inner map)",
		() => {
			for (let i = 0; i < BATCH; i++) {
				sink[i] = new sources.SourceMapSource(
					fixtureCode,
					"out.js",
					fixtureMap,
					fixtureCode,
					fixtureMap,
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
		"source-map-source memory: map({ columns: true })",
		() => {
			for (let i = 0; i < BATCH; i++) {
				const sms = new sources.SourceMapSource(
					fixtureCode,
					"out.js",
					fixtureMap,
				);
				sms.map({ columns: true });
				sink[i] = sms;
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
		"source-map-source memory: sourceAndMap({ columns: true }) (combined inner)",
		() => {
			for (let i = 0; i < BATCH; i++) {
				const sms = new sources.SourceMapSource(
					fixtureCode,
					"out.js",
					fixtureMap,
					fixtureCode,
					fixtureMap,
				);
				sms.sourceAndMap({ columns: true });
				sink[i] = sms;
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
