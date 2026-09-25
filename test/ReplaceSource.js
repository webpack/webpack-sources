"use strict";

const assert = require("assert");
const crypto = require("crypto");
const { describe, it } = require("node:test");
/** @typedef {import("../lib/Source").RawSourceMap} RawSourceMap */

const validate = require("sourcemap-validator");
const { ReplaceSource } = require("../");
const { OriginalSource } = require("../");
const { RawSource } = require("../");
const { SourceMapSource } = require("../");
const { withReadableMappings } = require("./helpers");

describe("replaceSource", () => {
	it("should replace correctly", (t) => {
		let line1;
		let line2;
		let line3;
		let line4;
		let line5;
		const source = new ReplaceSource(
			new OriginalSource(
				[
					(line1 = "Hello World!"),
					(line2 = "{}"),
					(line3 = "Line 3"),
					(line4 = "Line 4"),
					(line5 = "Line 5"),
					"Last",
					"Line",
				].join("\n"),
				"file.txt",
			),
		);
		const startLine3 = line1.length + line2.length + 2;
		const startLine6 =
			startLine3 + line3.length + line4.length + line5.length + 3;
		source.replace(
			startLine3,
			startLine3 + line3.length + line4.length + line5.length + 2,
			"",
		);
		source.replace(1, 4, "i ");
		source.replace(1, 4, "bye");
		source.replace(7, 7, "0000");
		source.insert(line1.length + 2, "\n Multi Line\n");
		source.replace(startLine6 + 4, startLine6 + 4, " ");
		const originalSource = source.original();
		const originalText = originalSource.source();
		const resultText = source.source();
		const result = source.sourceAndMap({
			columns: true,
		});
		const resultListMap = source.sourceAndMap({
			columns: false,
		});

		assert.deepStrictEqual(originalSource, source._source);
		assert.strictEqual(
			originalText,
			"Hello World!\n{}\nLine 3\nLine 4\nLine 5\nLast\nLine",
		);
		// const resultText = "Hi bye W0000rld!\n{\n Multi Line\n}\nLast Line";
		assert.strictEqual(
			resultText,
			"Hi bye W0000rld!\n{\n Multi Line\n}\nLast Line",
		);
		assert.deepStrictEqual(result.source, resultText);
		assert.deepStrictEqual(resultListMap.source, resultText);
		const listMap = /** @type {RawSourceMap} */ (resultListMap.map);
		const resultMap = /** @type {RawSourceMap} */ (result.map);
		assert.deepStrictEqual(listMap.file, resultMap.file);
		assert.deepStrictEqual(listMap.version, resultMap.version);
		assert.deepStrictEqual(listMap.sources, resultMap.sources);
		assert.deepStrictEqual(listMap.sourcesContent, resultMap.sourcesContent);
		t.assert.snapshot(withReadableMappings(resultMap)._mappings);
		t.assert.snapshot(withReadableMappings(resultListMap.map)._mappings);
	});

	it("should replace multiple items correctly", () => {
		let line1;
		const source = new ReplaceSource(
			new OriginalSource([(line1 = "Hello"), "World!"].join("\n"), "file.txt"),
		);
		source.insert(0, "Message: ");
		source.replace(2, line1.length + 4, "y A");
		const resultText = source.source();
		const result = source.sourceAndMap({
			columns: true,
		});
		const resultListMap = source.sourceAndMap({
			columns: false,
		});

		assert.strictEqual(resultText, "Message: Hey Ad!");
		assert.deepStrictEqual(result.source, resultText);
		assert.deepStrictEqual(resultListMap.source, resultText);
		const listMap = /** @type {RawSourceMap} */ (resultListMap.map);
		const resultMap = /** @type {RawSourceMap} */ (result.map);
		assert.deepStrictEqual(listMap.file, resultMap.file);
		assert.deepStrictEqual(listMap.version, resultMap.version);
		assert.deepStrictEqual(listMap.sources, resultMap.sources);
		assert.deepStrictEqual(listMap.sourcesContent, resultMap.sourcesContent);
		assert.strictEqual(resultMap.mappings, "AAAA,WAAE,GACE");
		assert.strictEqual(listMap.mappings, "AAAA");
	});

	it("should prepend items correctly", () => {
		const source = new ReplaceSource(new OriginalSource("Line 1", "file.txt"));
		source.insert(-1, "Line -1\n");
		source.insert(-1, "Line 0\n");
		const resultText = source.source();
		const result = source.sourceAndMap({
			columns: true,
		});
		const resultListMap = source.sourceAndMap({
			columns: false,
		});

		assert.strictEqual(resultText, "Line -1\nLine 0\nLine 1");
		assert.deepStrictEqual(result.source, resultText);
		assert.deepStrictEqual(resultListMap.source, resultText);
		const listMap = /** @type {RawSourceMap} */ (resultListMap.map);
		const resultMap = /** @type {RawSourceMap} */ (result.map);
		assert.deepStrictEqual(listMap.file, resultMap.file);
		assert.deepStrictEqual(listMap.version, resultMap.version);
		assert.deepStrictEqual(listMap.sources, resultMap.sources);
		assert.deepStrictEqual(listMap.sourcesContent, resultMap.sourcesContent);
		assert.strictEqual(resultMap.mappings, "AAAA;AAAA;AAAA");
		assert.strictEqual(listMap.mappings, "AAAA;AAAA;AAAA");
	});

	it("should prepend items with replace at start correctly", () => {
		const source = new ReplaceSource(
			new OriginalSource(["Line 1", "Line 2"].join("\n"), "file.txt"),
		);
		source.insert(-1, "Line 0\n");
		source.replace(0, 5, "Hello");
		const resultText = source.source();
		const result = source.sourceAndMap({
			columns: true,
		});
		const resultListMap = source.sourceAndMap({
			columns: false,
		});

		assert.strictEqual(resultText, "Line 0\nHello\nLine 2");
		assert.deepStrictEqual(result.source, resultText);
		assert.deepStrictEqual(resultListMap.source, resultText);
		const listMap = /** @type {RawSourceMap} */ (resultListMap.map);
		const resultMap = /** @type {RawSourceMap} */ (result.map);
		assert.deepStrictEqual(listMap.file, resultMap.file);
		assert.deepStrictEqual(listMap.version, resultMap.version);
		assert.deepStrictEqual(listMap.sources, resultMap.sources);
		assert.deepStrictEqual(listMap.sourcesContent, resultMap.sourcesContent);
		assert.strictEqual(resultMap.mappings, "AAAA;AAAA,KAAM;AACN");
		assert.strictEqual(listMap.mappings, "AAAA;AAAA;AACA");
	});

	it("should append items correctly", () => {
		let line1;
		const source = new ReplaceSource(
			new OriginalSource((line1 = "Line 1\n"), "file.txt"),
		);
		source.insert(line1.length + 1, "Line 2\n");
		const resultText = source.source();
		const result = source.sourceAndMap({
			columns: true,
		});
		const resultListMap = source.sourceAndMap({
			columns: false,
		});

		assert.strictEqual(resultText, "Line 1\nLine 2\n");
		assert.deepStrictEqual(result.source, resultText);
		assert.deepStrictEqual(resultListMap.source, resultText);
		const listMap = /** @type {RawSourceMap} */ (resultListMap.map);
		const resultMap = /** @type {RawSourceMap} */ (result.map);
		assert.deepStrictEqual(listMap.file, resultMap.file);
		assert.deepStrictEqual(listMap.version, resultMap.version);
		assert.deepStrictEqual(listMap.sources, resultMap.sources);
		assert.deepStrictEqual(listMap.sourcesContent, resultMap.sourcesContent);
		assert.strictEqual(resultMap.mappings, "AAAA");
		assert.strictEqual(listMap.mappings, "AAAA");
	});

	it("should produce correct source map", () => {
		const bootstrapCode = "   var hello\n   var world\n";

		assert.throws(() => {
			const source = new ReplaceSource(
				new OriginalSource(bootstrapCode, "file.js"),
			);
			source.replace(7, 11, "h", "incorrect");
			source.replace(20, 24, "w", "identifiers");
			const resultMap = source.sourceAndMap();
			validate(resultMap.source, JSON.stringify(resultMap.map));
		}, /mismatched names/);

		const source = new ReplaceSource(
			new OriginalSource(bootstrapCode, "file.js"),
		);
		source.replace(7, 11, "h", "hello");
		source.replace(20, 24, "w", "world");
		const resultMap = source.sourceAndMap();
		validate(resultMap.source, JSON.stringify(resultMap.map));
	});

	it("should allow replacements at the start", (t) => {
		const map = {
			version: 3,
			sources: ["abc"],
			names: ["StaticPage", "data", "foo"],
			mappings:
				";;AAAA,eAAe,SAASA,UAAT,OAA8B;AAAA,MAARC,IAAQ,QAARA,IAAQ;AAC3C,sBAAO;AAAA,cAAMA,IAAI,CAACC;AAAX,IAAP;AACD",
			/*
				3:0 -> [abc] 1:0, :15 -> [abc] 1:15, :24 -> [abc] 1:24 (StaticPage), :34 -> [abc] 1:15, :41 -> [abc] 1:45
				4:0 -> [abc] 1:45, :6 -> [abc] 1:37 (data), :10 -> [abc] 1:45, :18 -> [abc] 1:37 (data), :22 -> [abc] 1:45
				5:0 -> [abc] 2:2, :22 -> [abc] 2:9
				6:0 -> [abc] 2:9, :14 -> [abc] 2:15 (data), :18 -> [abc] 2:19, :19 -> [abc] 2:20 (foo)
				7:0 -> [abc] 2:9, :4 -> [abc] 2:2
				8:0 -> [abc] 3:1
			*/
			sourcesContent: [
				`export default function StaticPage({ data }) {
  return <div>{data.foo}</div>
}
`,
			],
			file: "x",
		};
		const code = `import { jsx as _jsx } from "react/jsx-runtime";
export var __N_SSG = true;
export default function StaticPage(_ref) {
	var data = _ref.data;
	return /*#__PURE__*/_jsx("div", {
		children: data.foo
	});
}`;
		const source = new ReplaceSource(
			new SourceMapSource(code, "source.js", map),
		);
		source.replace(0, 47, "");
		source.replace(49, 55, "");
		source.replace(76, 90, "");
		source.replace(
			165,
			168,
			"(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)",
		);
		t.assert.snapshot(withReadableMappings(source.map()));
	});

	it("should not generate invalid mappings when replacing multiple lines of code", (t) => {
		const source = new ReplaceSource(
			new OriginalSource(
				["if (a;b;c) {", "  a; b; c;", "}"].join("\n"),
				"document.js",
			),
			"_document.js",
		);
		source.replace(4, 8, "false");
		source.replace(12, 23, "");
		t.assert.snapshot(source.source());
		t.assert.snapshot(withReadableMappings(source.map(), source.source()));
	});

	it("should return getName()", () => {
		const source = new ReplaceSource(
			new OriginalSource("Hello World", "file.txt"),
			"named.txt",
		);
		assert.strictEqual(source.getName(), "named.txt");
	});

	it("should return getName() as undefined when not provided", () => {
		const source = new ReplaceSource(new OriginalSource("Hi", "file.txt"));
		assert.strictEqual(source.getName(), undefined);
	});

	it("should return sorted replacements from getReplacements", () => {
		const source = new ReplaceSource(
			new OriginalSource("Hello World", "file.txt"),
		);
		source.replace(6, 10, "Claude");
		source.replace(0, 4, "Howdy");
		const replacements = source.getReplacements();
		assert.strictEqual(replacements.length, 2);
		assert.strictEqual(replacements[0].content, "Howdy");
		assert.strictEqual(replacements[1].content, "Claude");
	});

	it("should skip sorting when replacements were added in order", () => {
		const source = new ReplaceSource(
			new OriginalSource("Hello World", "file.txt"),
		);
		source.replace(0, 4, "Howdy");
		source.replace(6, 10, "Claude");
		const { sort: originalSort } = Array.prototype;
		let sortCalls = 0;
		// eslint-disable-next-line no-extend-native
		Array.prototype.sort = function sort(...args) {
			sortCalls++;
			return originalSort.apply(this, args);
		};
		try {
			assert.strictEqual(source.source(), "Howdy Claude");
			assert.strictEqual(sortCalls, 0);
		} finally {
			// eslint-disable-next-line no-extend-native
			Array.prototype.sort = originalSort;
		}
	});

	it("should sort when replacements were added out of order", () => {
		const source = new ReplaceSource(
			new OriginalSource("Hello World", "file.txt"),
		);
		source.replace(6, 10, "Claude");
		source.replace(0, 4, "Howdy");
		const { sort: originalSort } = Array.prototype;
		let sortCalls = 0;
		// eslint-disable-next-line no-extend-native
		Array.prototype.sort = function sort(...args) {
			sortCalls++;
			return originalSort.apply(this, args);
		};
		try {
			assert.strictEqual(source.source(), "Howdy Claude");
			assert.strictEqual(sortCalls, 1);
		} finally {
			// eslint-disable-next-line no-extend-native
			Array.prototype.sort = originalSort;
		}
	});

	it("should re-sort when a replacement is added out of order after a read", () => {
		const source = new ReplaceSource(
			new OriginalSource("Hello World", "file.txt"),
		);
		source.replace(6, 10, "Claude");
		assert.strictEqual(source.source(), "Hello Claude");
		source.replace(0, 4, "Howdy");
		assert.strictEqual(source.source(), "Howdy Claude");
	});

	it("should keep insertion order for replacements at the same position", () => {
		const inOrder = new ReplaceSource(
			new OriginalSource("Hello World", "file.txt"),
		);
		inOrder.insert(5, " first");
		inOrder.insert(5, " second");
		assert.strictEqual(inOrder.source(), "Hello first second World");

		// same ties, but with an out-of-order append forcing a real sort
		const sorted = new ReplaceSource(
			new OriginalSource("Hello World", "file.txt"),
		);
		sorted.insert(5, " first");
		sorted.insert(5, " second");
		sorted.replace(0, 4, "Howdy");
		assert.strictEqual(sorted.source(), "Howdy first second World");
	});

	it("should throw when replace() gets non-string newValue", () => {
		const source = new ReplaceSource(
			new OriginalSource("Hello World", "file.txt"),
		);
		assert.throws(() => {
			// @ts-expect-error for tests
			source.replace(0, 4, 123);
		}, /insertion must be a string/);
	});

	it("should throw when insert() gets non-string newValue", () => {
		const source = new ReplaceSource(
			new OriginalSource("Hello World", "file.txt"),
		);
		assert.throws(() => {
			// @ts-expect-error for tests
			source.insert(0, 123);
		}, /insertion must be a string/);
	});

	it("should pass through source and map untouched when no replacements", () => {
		const innerSource = new OriginalSource("Hello World", "file.txt");
		const source = new ReplaceSource(innerSource);
		assert.strictEqual(source.source(), innerSource.source());
		assert.deepStrictEqual(source.map(), innerSource.map());
		assert.deepStrictEqual(source.sourceAndMap(), innerSource.sourceAndMap());
	});

	it("should return original source when no replacements", () => {
		const innerSource = new OriginalSource("Hello World", "file.txt");
		const source = new ReplaceSource(innerSource);
		assert.strictEqual(source.original(), innerSource);
	});

	it("should update hash consistently", () => {
		const inner = new OriginalSource("Hello World", "file.txt");

		const source1 = new ReplaceSource(inner, "name");
		source1.replace(0, 4, "Howdy", "greeting");
		source1.insert(6, "[ins]");

		const source2 = new ReplaceSource(inner, "name");
		source2.replace(0, 4, "Howdy", "greeting");
		source2.insert(6, "[ins]");

		const source3 = new ReplaceSource(inner);
		source3.replace(0, 4, "Hey");

		const hash1 = crypto.createHash("md5");
		source1.updateHash(hash1);
		const digest1 = hash1.digest("hex");

		const hash2 = crypto.createHash("md5");
		source2.updateHash(hash2);
		const digest2 = hash2.digest("hex");

		const hash3 = crypto.createHash("md5");
		source3.updateHash(hash3);
		const digest3 = hash3.digest("hex");

		assert.strictEqual(digest1, digest2);
		assert.notStrictEqual(digest1, digest3);
	});

	it("should handle replacements that skip a chunk ending with newline", () => {
		const source = new ReplaceSource(
			new OriginalSource(
				["line1", "line2", "line3", "line4"].join("\n"),
				"file.txt",
			),
		);
		source.replace(6, 17, "X");
		assert.strictEqual(source.source(), "line1\nXline4");
	});

	it("should handle multi-line replacement content", () => {
		const source = new ReplaceSource(
			new OriginalSource("hello world", "file.txt"),
		);
		source.replace(6, 10, "multi\nline\nreplacement");
		assert.strictEqual(source.source(), "hello multi\nline\nreplacement");
	});

	it("should handle a replacement that happens at source end", () => {
		const source = new ReplaceSource(new OriginalSource("hello", "file.txt"));
		source.insert(5, " world");
		source.insert(5, "!");
		assert.strictEqual(source.source(), "hello world!");
	});

	it("should handle replacements ending with newline", () => {
		const source = new ReplaceSource(
			new OriginalSource("abc\ndef\nghi", "file.txt"),
		);
		source.replace(0, 2, "xyz\n");
		assert.strictEqual(source.source(), "xyz\n\ndef\nghi");
	});

	it("should work with RawSource as source (no map)", () => {
		const source = new ReplaceSource(new RawSource("Hello World"));
		source.replace(6, 10, "You");
		assert.strictEqual(source.source(), "Hello You");
		assert.strictEqual(source.sourceAndMap().source, "Hello You");
	});

	it("should expose buffers() reflecting the replaced source", () => {
		const source = new ReplaceSource(new RawSource("Hello World"));
		source.replace(6, 10, "You");
		const buffers = source.buffers();
		assert.strictEqual(Array.isArray(buffers), true);
		assert.strictEqual(buffers.length, 1);
		assert.deepStrictEqual(buffers[0], Buffer.from("Hello You"));
		assert.deepStrictEqual(Buffer.concat(buffers), source.buffer());
	});

	it("should delegate buffers() to the underlying source when no replacements", () => {
		const inner = new RawSource(Buffer.from("untouched"));
		const source = new ReplaceSource(inner);
		const buffers = source.buffers();
		assert.strictEqual(buffers.length, 1);
		assert.strictEqual(buffers[0], inner.buffer());
		assert.strictEqual(source.buffer(), inner.buffer());
	});

	it("streamChunks() trailing-remainer reuses column offset from prior in-chunk replacement", () => {
		// In-chunk replacement updates generatedColumnOffsetLine to the
		// trailing-remainer's line, so the trailing-remainer fast path
		// takes the `generatedColumnOffsetLine === line` branch (the
		// accumulate path, not the reset path). Drive streamChunks
		// directly — source() doesn't go through it.
		const inner = new OriginalSource("abc", "x.js");
		const src = new ReplaceSource(inner);
		src.replace(0, 0, "X"); // in-chunk: sets generatedColumnOffsetLine to 1
		src.insert(10, "Y"); // trailing: hits the fast path on same line
		const chunks = [];
		src.streamChunks(
			{},
			(chunk, gl, gc) => chunks.push([chunk, gl, gc]),
			() => {},
			() => {},
		);
		const trailing = chunks[chunks.length - 1];
		assert.strictEqual(trailing[0], "Y");
		assert.strictEqual(trailing[1], 1);
	});

	it("streamChunks() emits trailing inserts past end-of-source", () => {
		// Two `insert` calls past the inner source's end coalesce into a
		// single trailing-remainer emission on the final generated line.
		const inner = new OriginalSource("hello", "x.js");
		const src = new ReplaceSource(inner);
		src.insert(5, "X");
		src.insert(5, "Y");
		const chunks = [];
		src.streamChunks(
			{},
			(chunk, gl, gc) => chunks.push([chunk, gl, gc]),
			() => {},
			() => {},
		);
		assert.strictEqual(src.source(), "helloXY");
		const trailing = chunks[chunks.length - 1];
		assert.strictEqual(trailing[0], "XY");
		assert.strictEqual(trailing[1], 1);
		assert.strictEqual(trailing[2], 5);
	});

	it("streamChunks() handles in-chunk multi-line replacement ending without newline", () => {
		// Replace a single-character span with multi-line content whose
		// last line doesn't end with '\n'. Exercises the in-chunk
		// `m === matches.length - 1 && !contentLine.endsWith("\n")` branch
		// in streamChunks (the multi-line counterpart to the single-line
		// fast path).
		const inner = new OriginalSource("ab", "x.js");
		const src = new ReplaceSource(inner);
		src.replace(0, 0, "A\nB");
		assert.strictEqual(src.source(), "A\nBb");
		const chunks = [];
		src.streamChunks(
			{},
			(chunk) => chunks.push(chunk),
			() => {},
			() => {},
		);
		assert.ok(chunks.includes("A\n"));
		assert.ok(chunks.includes("B"));
	});

	it("streamChunks() emits multi-line trailing inserts via splitIntoLines", () => {
		const inner = new OriginalSource("a", "x.js");
		const src = new ReplaceSource(inner);
		src.insert(1, "B\nC");
		const chunks = [];
		src.streamChunks(
			{},
			(chunk) => chunks.push(chunk),
			() => {},
			() => {},
		);
		assert.strictEqual(src.source(), "aB\nC");
		// splitIntoLines("B\nC") returns ["B\n", "C"] — both should be
		// emitted as separate chunks rather than coalesced.
		assert.ok(chunks.includes("B\n"));
		assert.ok(chunks.includes("C"));
	});

	it("streamChunks() handles empty replacement without emitting a zero-length chunk", () => {
		const inner = new OriginalSource("abcdef", "x.js");
		const src = new ReplaceSource(inner);
		src.replace(2, 3, "");
		const chunks = [];
		src.streamChunks(
			{},
			(chunk) => chunks.push(chunk),
			() => {},
			() => {},
		);
		assert.strictEqual(src.source(), "abef");
		assert.strictEqual(
			chunks.every((c) => c === undefined || c.length > 0),
			true,
		);
	});

	it("streamChunks() pads sourceContents for multi-source inner (sourceIndex > 0)", () => {
		// Wrap a SourceMapSource that has multiple sources. The
		// streamChunks `onSource` callback gets called with sourceIndex
		// values > 0, exercising the `while (sourceContents.length < i)`
		// padding loop on line ~515.
		const innerMap = {
			version: 3,
			file: "out.js",
			sources: ["a.js", "b.js", "c.js"],
			sourcesContent: ["a\n", "b\n", "c\n"],
			mappings: "AAAA;ACAA;ACAA",
			names: [],
		};
		const inner = new SourceMapSource("a\nb\nc\n", "out.js", innerMap);
		const src = new ReplaceSource(inner);
		src.replace(0, 0, "A"); // force at least one replacement
		const result = src.sourceAndMap({});
		assert.strictEqual(result.source, "A\nb\nc\n");
		// All three inner sources must survive into the result map.
		const { map } = result;
		assert.deepStrictEqual(/** @type {RawSourceMap} */ (map).sources, [
			"a.js",
			"b.js",
			"c.js",
		]);
	});

	it("streamChunks() tracks generated columns across multiple replacements on one line", () => {
		const inner = new OriginalSource("aaaaa", "x.js");
		const src = new ReplaceSource(inner);
		src.replace(0, 0, "BBBBB");
		src.replace(2, 2, "CC");
		assert.strictEqual(src.source(), "BBBBBaCCaa");
		const chunks = [];
		src.streamChunks(
			{},
			(chunk, gl, gc) => chunks.push([chunk, gl, gc]),
			() => {},
			() => {},
		);
		const lineOneCols = chunks
			.filter(([, gl]) => gl === 1)
			.map(([, , gc]) => gc);
		assert.deepStrictEqual(
			lineOneCols,
			[...lineOneCols].sort((a, b) => a - b),
		);
	});
});
