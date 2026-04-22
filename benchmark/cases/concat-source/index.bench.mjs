/*
 * concat-source
 *
 * ConcatSource is the bread-and-butter composition primitive used by
 * webpack. We cover the construction/optimize path, the three output
 * representations (source/buffer/map), and the common case where a
 * SourceMapSource or nested ConcatSource participates in streaming.
 */

import { createHash } from "crypto";
import sources from "../../../lib/index.js";
import { fixtureCode, fixtureMap, noop } from "../../fixtures.mjs";

/**
 * @returns {ConcatSource} mixed 4-child ConcatSource
 */
function buildMixed() {
	return new sources.ConcatSource(
		new sources.RawSource("// header\n"),
		new sources.OriginalSource(fixtureCode, "a.js"),
		"\n// middle\n",
		new sources.OriginalSource(fixtureCode, "b.js"),
	);
}

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	bench.add("concat-source: new ConcatSource() (10 raw)", () => {
		for (let iter = 0; iter < 20; iter++) {
			const parts = [];
			for (let i = 0; i < 10; i++) {
				parts.push(new sources.RawSource(fixtureCode));
			}
			new sources.ConcatSource(...parts);
		}
	});

	bench.add("concat-source: new ConcatSource() (strings)", () => {
		for (let i = 0; i < 100; i++) {
			new sources.ConcatSource("a", "b", "c", "d", "e", "f");
		}
	});

	bench.add("concat-source: add() x50", () => {
		const cs = new sources.ConcatSource();
		for (let i = 0; i < 50; i++) cs.add(new sources.RawSource(fixtureCode));
	});

	bench.add("concat-source: addAllSkipOptimizing()", () => {
		const cs = new sources.ConcatSource();
		const parts = [];
		for (let i = 0; i < 50; i++) parts.push(new sources.RawSource(fixtureCode));
		cs.addAllSkipOptimizing(parts);
	});

	bench.add("concat-source: source() (10 raw)", () => {
		const parts = [];
		for (let i = 0; i < 10; i++) parts.push(new sources.RawSource(fixtureCode));
		const cs = new sources.ConcatSource(...parts);
		for (let i = 0; i < 10; i++) cs.source();
	});

	bench.add("concat-source: source() (mixed)", () => {
		const cs = buildMixed();
		for (let i = 0; i < 10; i++) cs.source();
	});

	bench.add("concat-source: buffer() (10 raw)", () => {
		const parts = [];
		for (let i = 0; i < 10; i++) parts.push(new sources.RawSource(fixtureCode));
		const cs = new sources.ConcatSource(...parts);
		for (let i = 0; i < 10; i++) cs.buffer();
	});

	bench.add("concat-source: buffers() (10 raw)", () => {
		const parts = [];
		for (let i = 0; i < 10; i++) parts.push(new sources.RawSource(fixtureCode));
		const cs = new sources.ConcatSource(...parts);
		for (let i = 0; i < 10; i++) cs.buffers();
	});

	bench.add("concat-source: buffer() (nested 4x10 raw)", () => {
		const makeInner = () => {
			const parts = [];
			for (let i = 0; i < 10; i++) {
				parts.push(new sources.RawSource(fixtureCode));
			}
			return new sources.ConcatSource(...parts);
		};
		const cs = new sources.ConcatSource(
			makeInner(),
			makeInner(),
			makeInner(),
			makeInner(),
		);
		for (let i = 0; i < 5; i++) cs.buffer();
	});

	bench.add("concat-source: buffers() (nested 4x10 raw)", () => {
		const makeInner = () => {
			const parts = [];
			for (let i = 0; i < 10; i++) {
				parts.push(new sources.RawSource(fixtureCode));
			}
			return new sources.ConcatSource(...parts);
		};
		const cs = new sources.ConcatSource(
			makeInner(),
			makeInner(),
			makeInner(),
			makeInner(),
		);
		for (let i = 0; i < 5; i++) cs.buffers();
	});

	bench.add("concat-source: size()", () => {
		const cs = buildMixed();
		for (let i = 0; i < 10; i++) cs.size();
	});

	bench.add("concat-source: getChildren()", () => {
		const cs = buildMixed();
		for (let i = 0; i < 100; i++) cs.getChildren();
	});

	bench.add("concat-source: map()", () => {
		for (let i = 0; i < 5; i++) buildMixed().map({});
	});

	bench.add("concat-source: sourceAndMap()", () => {
		for (let i = 0; i < 5; i++) buildMixed().sourceAndMap({});
	});

	bench.add("concat-source: streamChunks() (mixed)", () => {
		for (let i = 0; i < 5; i++) {
			buildMixed().streamChunks({}, noop, noop, noop);
		}
	});

	bench.add("concat-source: streamChunks({finalSource:true})", () => {
		for (let i = 0; i < 5; i++) {
			buildMixed().streamChunks({ finalSource: true }, noop, noop, noop);
		}
	});

	bench.add("concat-source: streamChunks() with SourceMapSource child", () => {
		for (let i = 0; i < 5; i++) {
			const cs = new sources.ConcatSource(
				new sources.SourceMapSource(fixtureCode, "fixture.js", fixtureMap),
				new sources.RawSource("// trailer\n"),
			);
			cs.streamChunks({}, noop, noop, noop);
		}
	});

	bench.add("concat-source: nested flattening", () => {
		for (let i = 0; i < 50; i++) {
			const inner = new sources.ConcatSource(
				new sources.RawSource("a"),
				new sources.RawSource("b"),
				new sources.RawSource("c"),
			);
			new sources.ConcatSource(
				inner,
				new sources.RawSource("d"),
				inner,
			).source();
		}
	});

	bench.add("concat-source: updateHash()", () => {
		for (let i = 0; i < 10; i++) {
			buildMixed().updateHash(createHash("sha256"));
		}
	});
}
