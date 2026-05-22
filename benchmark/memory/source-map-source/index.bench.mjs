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

const BATCH = 20;

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
