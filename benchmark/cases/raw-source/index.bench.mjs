/*
 * raw-source
 *
 * Exercises every method on RawSource across both string and Buffer input
 * variants. Each task body runs a small batch so that the reported
 * throughput reflects per-batch cost rather than per-op overhead.
 */

import { createHash } from "crypto";
import { RawSource } from "../../../lib/index.js";
import { fixtureBuffer, fixtureCode, noop } from "../../fixtures.mjs";

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	bench.add("raw-source: new RawSource(string)", () => {
		for (let i = 0; i < 50; i++) new RawSource(fixtureCode);
	});

	bench.add("raw-source: new RawSource(buffer)", () => {
		for (let i = 0; i < 50; i++) new RawSource(fixtureBuffer);
	});

	bench.add("raw-source: new RawSource(buffer, true)", () => {
		for (let i = 0; i < 50; i++) new RawSource(fixtureBuffer, true);
	});

	bench.add("raw-source: source() (string)", () => {
		for (let i = 0; i < 50; i++) new RawSource(fixtureCode).source();
	});

	bench.add("raw-source: source() cached", () => {
		const src = new RawSource(fixtureCode);
		for (let i = 0; i < 500; i++) src.source();
	});

	bench.add("raw-source: buffer() (from string)", () => {
		for (let i = 0; i < 50; i++) new RawSource(fixtureCode).buffer();
	});

	bench.add("raw-source: buffer() (from buffer)", () => {
		for (let i = 0; i < 50; i++) new RawSource(fixtureBuffer).buffer();
	});

	bench.add("raw-source: size()", () => {
		for (let i = 0; i < 50; i++) new RawSource(fixtureCode).size();
	});

	bench.add("raw-source: isBuffer()", () => {
		const src = new RawSource(fixtureBuffer);
		for (let i = 0; i < 500; i++) src.isBuffer();
	});

	bench.add("raw-source: map()", () => {
		for (let i = 0; i < 50; i++) new RawSource(fixtureCode).map({});
	});

	bench.add("raw-source: sourceAndMap()", () => {
		for (let i = 0; i < 50; i++) new RawSource(fixtureCode).sourceAndMap({});
	});

	bench.add("raw-source: streamChunks()", () => {
		for (let i = 0; i < 20; i++) {
			new RawSource(fixtureCode).streamChunks({}, noop, noop, noop);
		}
	});

	bench.add("raw-source: streamChunks({finalSource:true})", () => {
		for (let i = 0; i < 20; i++) {
			new RawSource(fixtureCode).streamChunks(
				{ finalSource: true },
				noop,
				noop,
				noop,
			);
		}
	});

	bench.add("raw-source: updateHash()", () => {
		for (let i = 0; i < 20; i++) {
			new RawSource(fixtureCode).updateHash(createHash("sha256"));
		}
	});
}
