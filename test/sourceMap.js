"use strict";

const assert = require("assert");
const { describe, it } = require("node:test");
const OriginalSource = require("../lib/OriginalSource");
const { originalPositionFor } = require("../lib/helpers/sourceMap");

// Line 1: column 0 -> a.js 1:0, column 4 -> a.js 1:4 named `foo`.
// Line 2: column 2 -> a.js 2:4, column 4 -> a segment with no source.
/** @type {import("../lib/Source").RawSourceMap} */
const map = {
	version: 3,
	file: "bundle.js",
	sources: ["a.js"],
	names: ["foo"],
	mappings: "AAAA,IAAIA;EACA,E",
};

describe("sourceMap.originalPositionFor", () => {
	it("should find the mapping at the exact column", () => {
		assert.deepStrictEqual(originalPositionFor(map, 1, 0), {
			source: "a.js",
			line: 1,
			column: 0,
			name: null,
		});
		assert.deepStrictEqual(originalPositionFor(map, 1, 4), {
			source: "a.js",
			line: 1,
			column: 4,
			name: "foo",
		});
	});

	it("should find the closest mapping before the column", () => {
		assert.deepStrictEqual(originalPositionFor(map, 1, 3), {
			source: "a.js",
			line: 1,
			column: 0,
			name: null,
		});
		assert.deepStrictEqual(originalPositionFor(map, 1, 100), {
			source: "a.js",
			line: 1,
			column: 4,
			name: "foo",
		});
		assert.deepStrictEqual(originalPositionFor(map, 2, 3), {
			source: "a.js",
			line: 2,
			column: 4,
			name: null,
		});
	});

	it("should return null where nothing maps", () => {
		// before the line's first mapping
		assert.strictEqual(originalPositionFor(map, 2, 0), null);
		// a segment that carries no source
		assert.strictEqual(originalPositionFor(map, 2, 5), null);
		// a line with no mappings
		assert.strictEqual(originalPositionFor(map, 3, 0), null);
	});

	it("should join the source with sourceRoot", () => {
		assert.strictEqual(
			/** @type {NonNullable<ReturnType<typeof originalPositionFor>>} */ (
				originalPositionFor({ ...map, sourceRoot: "src" }, 1, 0)
			).source,
			"src/a.js",
		);
	});

	it("should accept the map as a string or a Buffer", () => {
		const expected = originalPositionFor(map, 1, 4);
		assert.deepStrictEqual(
			originalPositionFor(JSON.stringify(map), 1, 4),
			expected,
		);
		assert.deepStrictEqual(
			originalPositionFor(Buffer.from(JSON.stringify(map)), 1, 4),
			expected,
		);
	});

	it("should read back a map webpack-sources generated", () => {
		// One mapping per line, so any column resolves to the line's start.
		const generated = /** @type {import("../lib/Source").RawSourceMap} */ (
			new OriginalSource("const a = 1;\nconst b = 2;\n", "file.js").map()
		);
		assert.deepStrictEqual(originalPositionFor(generated, 2, 6), {
			source: "file.js",
			line: 2,
			column: 0,
			name: null,
		});
	});
});
