/*
 * size-only-source
 *
 * SizeOnlySource is trivially fast — only size() succeeds; every other
 * accessor throws. We benchmark the throw paths too since they're part of
 * the public API and exercise the constructor's per-instance _error
 * factory.
 */

import sources from "../../../lib/index.js";

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	bench.add("size-only-source: new SizeOnlySource()", () => {
		for (let i = 0; i < 500; i++) new sources.SizeOnlySource(1024);
	});

	bench.add("size-only-source: size()", () => {
		const src = new sources.SizeOnlySource(1024);
		for (let i = 0; i < 1000; i++) src.size();
	});

	bench.add("size-only-source: source() (throws)", () => {
		const src = new sources.SizeOnlySource(1024);
		for (let i = 0; i < 100; i++) {
			try {
				src.source();
			} catch {
				// expected
			}
		}
	});

	bench.add("size-only-source: buffer() (throws)", () => {
		const src = new sources.SizeOnlySource(1024);
		for (let i = 0; i < 100; i++) {
			try {
				src.buffer();
			} catch {
				// expected
			}
		}
	});

	bench.add("size-only-source: buffers() (throws)", () => {
		const src = new sources.SizeOnlySource(1024);
		for (let i = 0; i < 100; i++) {
			try {
				src.buffers();
			} catch {
				// expected
			}
		}
	});

	bench.add("size-only-source: map() (throws)", () => {
		const src = new sources.SizeOnlySource(1024);
		for (let i = 0; i < 100; i++) {
			try {
				src.map({});
			} catch {
				// expected
			}
		}
	});
}
