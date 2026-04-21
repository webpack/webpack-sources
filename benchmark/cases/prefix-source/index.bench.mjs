/*
 * prefix-source
 *
 * PrefixSource delegates most work to its child. The interesting paths are
 * source() (regex replace of \n) and streamChunks() (per-chunk column
 * adjustment with special-casing for column==0).
 */

import { createHash } from "crypto";
import {
	OriginalSource,
	PrefixSource,
	RawSource,
	SourceMapSource,
} from "../../../lib/index.js";
import { fixtureCode, fixtureMap, noop } from "../../fixtures.mjs";

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	bench.add("prefix-source: new PrefixSource(str, string)", () => {
		for (let i = 0; i < 100; i++) new PrefixSource("\t", fixtureCode);
	});

	bench.add("prefix-source: new PrefixSource(str, Source)", () => {
		for (let i = 0; i < 100; i++) {
			new PrefixSource("\t", new OriginalSource(fixtureCode, "fixture.js"));
		}
	});

	bench.add("prefix-source: getPrefix()", () => {
		const ps = new PrefixSource("\t", fixtureCode);
		for (let i = 0; i < 500; i++) ps.getPrefix();
	});

	bench.add("prefix-source: original()", () => {
		const ps = new PrefixSource("\t", new RawSource(fixtureCode));
		for (let i = 0; i < 500; i++) ps.original();
	});

	bench.add("prefix-source: source() (RawSource child)", () => {
		const ps = new PrefixSource("\t", new RawSource(fixtureCode));
		for (let i = 0; i < 10; i++) ps.source();
	});

	bench.add("prefix-source: source() (OriginalSource child)", () => {
		const ps = new PrefixSource(
			"\t",
			new OriginalSource(fixtureCode, "fixture.js"),
		);
		for (let i = 0; i < 10; i++) ps.source();
	});

	bench.add("prefix-source: buffer()", () => {
		const ps = new PrefixSource("\t", new RawSource(fixtureCode));
		for (let i = 0; i < 10; i++) ps.buffer();
	});

	bench.add("prefix-source: size()", () => {
		const ps = new PrefixSource("\t", new RawSource(fixtureCode));
		for (let i = 0; i < 10; i++) ps.size();
	});

	bench.add("prefix-source: map()", () => {
		for (let i = 0; i < 5; i++) {
			new PrefixSource("\t", new OriginalSource(fixtureCode, "fixture.js")).map(
				{},
			);
		}
	});

	bench.add("prefix-source: sourceAndMap()", () => {
		for (let i = 0; i < 5; i++) {
			new PrefixSource(
				"\t",
				new OriginalSource(fixtureCode, "fixture.js"),
			).sourceAndMap({});
		}
	});

	bench.add("prefix-source: streamChunks()", () => {
		for (let i = 0; i < 5; i++) {
			new PrefixSource(
				"\t",
				new OriginalSource(fixtureCode, "fixture.js"),
			).streamChunks({}, noop, noop, noop);
		}
	});

	bench.add("prefix-source: streamChunks() with SourceMapSource child", () => {
		for (let i = 0; i < 5; i++) {
			new PrefixSource(
				"  ",
				new SourceMapSource(fixtureCode, "fixture.js", fixtureMap),
			).streamChunks({}, noop, noop, noop);
		}
	});

	bench.add("prefix-source: updateHash()", () => {
		for (let i = 0; i < 10; i++) {
			new PrefixSource(
				"\t",
				new OriginalSource(fixtureCode, "fixture.js"),
			).updateHash(createHash("sha256"));
		}
	});
}
