/*
 * raw-source (memory mode)
 *
 * RawSource carries one or two payload references (`_value` and a
 * lazily-materialized `_valueAsBuffer` / `_valueAsString`). The
 * allocation hot spots are:
 *   - Buffer.from(string) when buffer() is called on a string-backed
 *     RawSource (a fresh Buffer per call unless dual-cache materializes)
 *   - the hash-update payload array (`_cachedHashUpdate` lives on the
 *     instance after first updateHash call)
 */

import { createHash } from "crypto";
import sources from "../../../lib/index.js";
import { fixtureBuffer, fixtureCode } from "../../fixtures.mjs";

// BATCH chosen so each measured iteration allocates >= ~30 KB. RawSource's
// `new RawSource(string)` touches a couple of fields per call (~16 B per
// object), so a small BATCH left per-iter measurement at sub-KB scale
// where CodSpeed's allocation-count differencing between glibc/V8
// versions amplified into double-digit phantom regressions.
const BATCH = 2000;

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	let sink;
	bench.add(
		"raw-source memory: new RawSource(string)",
		() => {
			for (let i = 0; i < BATCH; i++) {
				sink[i] = new sources.RawSource(fixtureCode);
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
		"raw-source memory: new RawSource(buffer)",
		() => {
			for (let i = 0; i < BATCH; i++) {
				sink[i] = new sources.RawSource(fixtureBuffer);
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
		"raw-source memory: string-backed + buffer() materializes Buffer",
		() => {
			for (let i = 0; i < BATCH; i++) {
				const rs = new sources.RawSource(fixtureCode);
				rs.buffer();
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
		"raw-source memory: updateHash() populates _cachedHashUpdate",
		() => {
			for (let i = 0; i < BATCH; i++) {
				const rs = new sources.RawSource(fixtureCode);
				rs.updateHash(createHash("md5"));
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
