/*
 * replace-source
 *
 * Covers ReplaceSource across the relevant cardinalities: no replacements
 * (pass-through), a handful of large-range replacements, and many small
 * overlapping replacements. The last is the interesting one for the
 * `source()` hot path optimised in this branch.
 */

import { createHash } from "crypto";
import sources from "../../../lib/index.js";
import { bigSource, fixtureCode, noop, smallSource } from "../../fixtures.mjs";

/**
 * @param {number} count count
 * @returns {ReplaceSource} source
 */
function buildManyReplacements(count) {
	const src = new sources.ReplaceSource(
		new sources.OriginalSource(bigSource, "big.js"),
	);
	let idx = bigSource.indexOf("value");
	let i = 0;
	while (idx !== -1 && i < count) {
		src.replace(idx, idx + 4, "v", "value");
		idx = bigSource.indexOf("value", idx + 5);
		i++;
	}
	return src;
}

/**
 * @returns {ReplaceSource} source
 */
function buildFewLargeReplacements() {
	const src = new sources.ReplaceSource(
		new sources.OriginalSource(bigSource, "big.js"),
	);
	src.replace(100, 500, "/* replaced */");
	src.replace(5000, 8000, "/* replaced */");
	src.replace(20000, 30000, "/* replaced */");
	return src;
}

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	bench.add("replace-source: new ReplaceSource()", () => {
		for (let i = 0; i < 100; i++) {
			new sources.ReplaceSource(new sources.RawSource(fixtureCode));
		}
	});

	bench.add("replace-source: replace() x1000", () => {
		const src = new sources.ReplaceSource(
			new sources.OriginalSource(bigSource, "big.js"),
		);
		for (let i = 0; i < 1000; i++) src.replace(i * 10, i * 10 + 3, "x");
	});

	bench.add("replace-source: insert() x1000", () => {
		const src = new sources.ReplaceSource(
			new sources.OriginalSource(bigSource, "big.js"),
		);
		for (let i = 0; i < 1000; i++) src.insert(i * 10, "y");
	});

	bench.add("replace-source: source() (no replacements)", () => {
		for (let i = 0; i < 100; i++) {
			new sources.ReplaceSource(new sources.RawSource(fixtureCode)).source();
		}
	});

	bench.add("replace-source: source() (small, 1 replacement)", () => {
		for (let i = 0; i < 100; i++) {
			const src = new sources.ReplaceSource(new sources.RawSource(smallSource));
			src.replace(0, 7, "var");
			src.source();
		}
	});

	bench.add("replace-source: source() (1000 small replacements)", () => {
		buildManyReplacements(1000).source();
	});

	bench.add("replace-source: source() (few large replacements)", () => {
		buildFewLargeReplacements().source();
	});

	bench.add("replace-source: size() (1000 small replacements)", () => {
		buildManyReplacements(1000).size();
	});

	bench.add("replace-source: buffer() (1000 small replacements)", () => {
		buildManyReplacements(1000).buffer();
	});

	bench.add("replace-source: buffer() (no replacements)", () => {
		for (let i = 0; i < 100; i++) {
			new sources.ReplaceSource(new sources.RawSource(fixtureCode)).buffer();
		}
	});

	bench.add("replace-source: buffers() (no replacements)", () => {
		for (let i = 0; i < 100; i++) {
			new sources.ReplaceSource(new sources.RawSource(fixtureCode)).buffers();
		}
	});

	bench.add("replace-source: buffers() (1000 small replacements)", () => {
		buildManyReplacements(1000).buffers();
	});

	bench.add("replace-source: map() (no replacements)", () => {
		for (let i = 0; i < 10; i++) {
			new sources.ReplaceSource(
				new sources.OriginalSource(fixtureCode, "fix.js"),
			).map({});
		}
	});

	bench.add("replace-source: map()", () => {
		for (let i = 0; i < 10; i++) {
			const src = new sources.ReplaceSource(
				new sources.OriginalSource(fixtureCode, "fix.js"),
			);
			src.replace(0, 10, "/* hdr */");
			src.insert(200, "// inj\n");
			src.map({});
		}
	});

	bench.add("replace-source: sourceAndMap()", () => {
		for (let i = 0; i < 10; i++) {
			const src = new sources.ReplaceSource(
				new sources.OriginalSource(fixtureCode, "fix.js"),
			);
			src.replace(0, 10, "/* hdr */");
			src.insert(200, "// inj\n");
			src.sourceAndMap({});
		}
	});

	bench.add("replace-source: streamChunks() (1000 replacements)", () => {
		buildManyReplacements(1000).streamChunks({}, noop, noop, noop);
	});

	bench.add("replace-source: getReplacements()", () => {
		buildManyReplacements(1000).getReplacements();
	});

	bench.add("replace-source: original()", () => {
		const src = new sources.ReplaceSource(new sources.RawSource(fixtureCode));
		for (let i = 0; i < 500; i++) src.original();
	});

	bench.add("replace-source: updateHash()", () => {
		for (let i = 0; i < 20; i++) {
			const src = new sources.ReplaceSource(
				new sources.OriginalSource(fixtureCode, "fix.js"),
				"fix",
			);
			src.replace(0, 10, "/* hdr */");
			src.insert(200, "// inj\n");
			src.updateHash(createHash("sha256"));
		}
	});
}
