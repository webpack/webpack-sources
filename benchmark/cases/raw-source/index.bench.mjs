/*
 * raw-source
 *
 * Exercises every method on RawSource across both string and Buffer input
 * variants. Each task body runs a small batch so that the reported
 * throughput reflects per-batch cost rather than per-op overhead.
 */

import { createHash } from "crypto";
import sources from "../../../lib/index.js";
import { fixtureBuffer, fixtureCode, noop } from "../../fixtures.mjs";

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	bench.add("raw-source: new RawSource(string)", () => {
		for (let i = 0; i < 50; i++) new sources.RawSource(fixtureCode);
	});

	bench.add("raw-source: new RawSource(buffer)", () => {
		for (let i = 0; i < 50; i++) new sources.RawSource(fixtureBuffer);
	});

	bench.add("raw-source: new RawSource(buffer, true)", () => {
		for (let i = 0; i < 50; i++) new sources.RawSource(fixtureBuffer, true);
	});

	bench.add("raw-source: source() (string)", () => {
		for (let i = 0; i < 50; i++) new sources.RawSource(fixtureCode).source();
	});

	bench.add("raw-source: source() cached", () => {
		const src = new sources.RawSource(fixtureCode);
		for (let i = 0; i < 500; i++) src.source();
	});

	bench.add("raw-source: buffer() (from string)", () => {
		for (let i = 0; i < 50; i++) new sources.RawSource(fixtureCode).buffer();
	});

	bench.add("raw-source: buffer() (from buffer)", () => {
		for (let i = 0; i < 50; i++) new sources.RawSource(fixtureBuffer).buffer();
	});

	bench.add("raw-source: buffers() (from string)", () => {
		for (let i = 0; i < 50; i++) new sources.RawSource(fixtureCode).buffers();
	});

	bench.add("raw-source: buffers() (from buffer)", () => {
		for (let i = 0; i < 50; i++) new sources.RawSource(fixtureBuffer).buffers();
	});

	bench.add("raw-source: buffers() cached", () => {
		const src = new sources.RawSource(fixtureBuffer);
		for (let i = 0; i < 500; i++) src.buffers();
	});

	bench.add("raw-source: size()", () => {
		for (let i = 0; i < 50; i++) new sources.RawSource(fixtureCode).size();
	});

	bench.add("raw-source: isBuffer()", () => {
		const src = new sources.RawSource(fixtureBuffer);
		for (let i = 0; i < 500; i++) src.isBuffer();
	});

	bench.add("raw-source: map()", () => {
		for (let i = 0; i < 50; i++) new sources.RawSource(fixtureCode).map({});
	});

	bench.add("raw-source: sourceAndMap()", () => {
		for (let i = 0; i < 50; i++) {
			new sources.RawSource(fixtureCode).sourceAndMap({});
		}
	});

	bench.add("raw-source: streamChunks()", () => {
		for (let i = 0; i < 20; i++) {
			new sources.RawSource(fixtureCode).streamChunks({}, noop, noop, noop);
		}
	});

	bench.add("raw-source: streamChunks({finalSource:true})", () => {
		for (let i = 0; i < 20; i++) {
			new sources.RawSource(fixtureCode).streamChunks(
				{ finalSource: true },
				noop,
				noop,
				noop,
			);
		}
	});

	bench.add("raw-source: updateHash()", () => {
		for (let i = 0; i < 20; i++) {
			new sources.RawSource(fixtureCode).updateHash(createHash("sha256"));
		}
	});
}
