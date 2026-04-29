"use strict";

/** @typedef {import("../lib/Source").RawSourceMap} RawSourceMap */

jest.mock("./__mocks__/createMappingsSerializer");

const crypto = require("crypto");
const validate = require("sourcemap-validator");
const { ReplaceSource } = require("../");
const { OriginalSource } = require("../");
const { RawSource } = require("../");
const { SourceMapSource } = require("../");
const { withReadableMappings } = require("./helpers");

describe("replaceSource", () => {
	it("should replace correctly", () => {
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

		// @ts-expect-error for tests
		expect(originalSource).toEqual(source._source);
		expect(originalText).toBe(
			"Hello World!\n{}\nLine 3\nLine 4\nLine 5\nLast\nLine",
		);
		// const resultText = "Hi bye W0000rld!\n{\n Multi Line\n}\nLast Line";
		expect(resultText).toBe("Hi bye W0000rld!\n{\n Multi Line\n}\nLast Line");
		expect(result.source).toEqual(resultText);
		expect(resultListMap.source).toEqual(resultText);
		const listMap = /** @type {RawSourceMap} */ (resultListMap.map);
		const resultMap = /** @type {RawSourceMap} */ (result.map);
		expect(listMap.file).toEqual(resultMap.file);
		expect(listMap.version).toEqual(resultMap.version);
		expect(listMap.sources).toEqual(resultMap.sources);
		expect(listMap.sourcesContent).toEqual(resultMap.sourcesContent);
		expect(withReadableMappings(resultMap)._mappings).toMatchInlineSnapshot(`
		"1:0 -> [file.txt] 1:0, :1 -> [file.txt] 1:1, :3 -> [file.txt] 1:5, :8 -> [file.txt] 1:7, :12 -> [file.txt] 1:8
		2:0 -> [file.txt] 2:0, :1 -> [file.txt] 2:1
		3:0 -> [file.txt] 2:1
		4:0 -> [file.txt] 2:1
		5:0 -> [file.txt] 6:0, :4 -> [file.txt] 6:4, :5 -> [file.txt] 7:0"
	`);
		expect(withReadableMappings(resultListMap.map)._mappings)
			.toMatchInlineSnapshot(`
		"1:0 -> [file.txt] 1:0
		2:0 -> [file.txt] 2:0
		3:0 -> [file.txt] 2:0
		4:0 -> [file.txt] 2:0
		5:0 -> [file.txt] 6:0"
	`);
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

		expect(resultText).toBe("Message: Hey Ad!");
		expect(result.source).toEqual(resultText);
		expect(resultListMap.source).toEqual(resultText);
		const listMap = /** @type {RawSourceMap} */ (resultListMap.map);
		const resultMap = /** @type {RawSourceMap} */ (result.map);
		expect(listMap.file).toEqual(resultMap.file);
		expect(listMap.version).toEqual(resultMap.version);
		expect(listMap.sources).toEqual(resultMap.sources);
		expect(listMap.sourcesContent).toEqual(resultMap.sourcesContent);
		expect(resultMap.mappings).toBe("AAAA,WAAE,GACE");
		expect(listMap.mappings).toBe("AAAA");
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

		expect(resultText).toBe("Line -1\nLine 0\nLine 1");
		expect(result.source).toEqual(resultText);
		expect(resultListMap.source).toEqual(resultText);
		const listMap = /** @type {RawSourceMap} */ (resultListMap.map);
		const resultMap = /** @type {RawSourceMap} */ (result.map);
		expect(listMap.file).toEqual(resultMap.file);
		expect(listMap.version).toEqual(resultMap.version);
		expect(listMap.sources).toEqual(resultMap.sources);
		expect(listMap.sourcesContent).toEqual(resultMap.sourcesContent);
		expect(resultMap.mappings).toBe("AAAA;AAAA;AAAA");
		expect(listMap.mappings).toBe("AAAA;AAAA;AAAA");
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

		expect(resultText).toBe("Line 0\nHello\nLine 2");
		expect(result.source).toEqual(resultText);
		expect(resultListMap.source).toEqual(resultText);
		const listMap = /** @type {RawSourceMap} */ (resultListMap.map);
		const resultMap = /** @type {RawSourceMap} */ (result.map);
		expect(listMap.file).toEqual(resultMap.file);
		expect(listMap.version).toEqual(resultMap.version);
		expect(listMap.sources).toEqual(resultMap.sources);
		expect(listMap.sourcesContent).toEqual(resultMap.sourcesContent);
		expect(resultMap.mappings).toBe("AAAA;AAAA,KAAM;AACN");
		expect(listMap.mappings).toBe("AAAA;AAAA;AACA");
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

		expect(resultText).toBe("Line 1\nLine 2\n");
		expect(result.source).toEqual(resultText);
		expect(resultListMap.source).toEqual(resultText);
		const listMap = /** @type {RawSourceMap} */ (resultListMap.map);
		const resultMap = /** @type {RawSourceMap} */ (result.map);
		expect(listMap.file).toEqual(resultMap.file);
		expect(listMap.version).toEqual(resultMap.version);
		expect(listMap.sources).toEqual(resultMap.sources);
		expect(listMap.sourcesContent).toEqual(resultMap.sourcesContent);
		expect(resultMap.mappings).toBe("AAAA");
		expect(listMap.mappings).toBe("AAAA");
	});

	it("should produce correct source map", () => {
		const bootstrapCode = "   var hello\n   var world\n";

		expect(() => {
			const source = new ReplaceSource(
				new OriginalSource(bootstrapCode, "file.js"),
			);
			source.replace(7, 11, "h", "incorrect");
			source.replace(20, 24, "w", "identifiers");
			const resultMap = source.sourceAndMap();
			validate(resultMap.source, JSON.stringify(resultMap.map));
		}).toThrow(/mismatched names/);

		const source = new ReplaceSource(
			new OriginalSource(bootstrapCode, "file.js"),
		);
		source.replace(7, 11, "h", "hello");
		source.replace(20, 24, "w", "world");
		const resultMap = source.sourceAndMap();
		validate(resultMap.source, JSON.stringify(resultMap.map));
	});

	it("should allow replacements at the start", () => {
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
		expect(withReadableMappings(source.map())).toMatchInlineSnapshot(`
		Object {
		  "_mappings": "3:0 -> [abc] 1:15, :9 -> [abc] 1:24 (StaticPage), :19 -> [abc] 1:15, :26 -> [abc] 1:45
		4:0 -> [abc] 1:45, :6 -> [abc] 1:37 (data), :10 -> [abc] 1:45, :18 -> [abc] 1:37 (data), :22 -> [abc] 1:45
		5:0 -> [abc] 2:2, :22 -> [abc] 2:9
		6:0 -> [abc] 2:9, :14 -> [abc] 2:15 (data), :18 -> [abc] 2:19, :19 -> [abc] 2:20 (foo)
		7:0 -> [abc] 2:9, :4 -> [abc] 2:2
		8:0 -> [abc] 3:1",
		  "file": "x",
		  "mappings": ";;AAAe,SAASA,UAAT,OAA8B;AAAA,MAARC,IAAQ,QAARA,IAAQ;AAC3C,sBAAO;AAAA,cAAMA,IAAI,CAACC;AAAX,IAAP;AACD",
		  "names": Array [
		    "StaticPage",
		    "data",
		    "foo",
		  ],
		  "sources": Array [
		    "abc",
		  ],
		  "sourcesContent": Array [
		    "export default function StaticPage({ data }) {
		  return <div>{data.foo}</div>
		}
		",
		  ],
		  "version": 3,
		}
	`);
	});

	it("should not generate invalid mappings when replacing multiple lines of code", () => {
		const source = new ReplaceSource(
			new OriginalSource(
				["if (a;b;c) {", "  a; b; c;", "}"].join("\n"),
				"document.js",
			),
			"_document.js",
		);
		source.replace(4, 8, "false");
		source.replace(12, 23, "");
		expect(source.source()).toMatchInlineSnapshot('"if (false) {}"');
		expect(withReadableMappings(source.map(), source.source()))
			.toMatchInlineSnapshot(`
		Object {
		  "_mappings": "1:0 -> [document.js] 1:0, :4 -> [document.js] 1:4, :9 -> [document.js] 1:9, :12 -> [document.js] 3:0
		if (false) {}
		^___^____^__^
		",
		  "file": "x",
		  "mappings": "AAAA,IAAI,KAAK,GAET",
		  "names": Array [],
		  "sources": Array [
		    "document.js",
		  ],
		  "sourcesContent": Array [
		    "if (a;b;c) {
		  a; b; c;
		}",
		  ],
		  "version": 3,
		}
	`);
	});

	it("should return getName()", () => {
		const source = new ReplaceSource(
			new OriginalSource("Hello World", "file.txt"),
			"named.txt",
		);
		expect(source.getName()).toBe("named.txt");
	});

	it("should return getName() as undefined when not provided", () => {
		const source = new ReplaceSource(new OriginalSource("Hi", "file.txt"));
		expect(source.getName()).toBeUndefined();
	});

	it("should return sorted replacements from getReplacements", () => {
		const source = new ReplaceSource(
			new OriginalSource("Hello World", "file.txt"),
		);
		source.replace(6, 10, "Claude");
		source.replace(0, 4, "Howdy");
		const replacements = source.getReplacements();
		expect(replacements).toHaveLength(2);
		expect(replacements[0].content).toBe("Howdy");
		expect(replacements[1].content).toBe("Claude");
	});

	it("should throw when replace() gets non-string newValue", () => {
		const source = new ReplaceSource(
			new OriginalSource("Hello World", "file.txt"),
		);
		expect(() => {
			// @ts-expect-error for tests
			source.replace(0, 4, 123);
		}).toThrow(/insertion must be a string/);
	});

	it("should throw when insert() gets non-string newValue", () => {
		const source = new ReplaceSource(
			new OriginalSource("Hello World", "file.txt"),
		);
		expect(() => {
			// @ts-expect-error for tests
			source.insert(0, 123);
		}).toThrow(/insertion must be a string/);
	});

	it("should pass through source and map untouched when no replacements", () => {
		const innerSource = new OriginalSource("Hello World", "file.txt");
		const source = new ReplaceSource(innerSource);
		expect(source.source()).toBe(innerSource.source());
		expect(source.map()).toEqual(innerSource.map());
		expect(source.sourceAndMap()).toEqual(innerSource.sourceAndMap());
	});

	it("should return original source when no replacements", () => {
		const innerSource = new OriginalSource("Hello World", "file.txt");
		const source = new ReplaceSource(innerSource);
		expect(source.original()).toBe(innerSource);
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

		expect(digest1).toBe(digest2);
		expect(digest1).not.toBe(digest3);
	});

	it("should handle replacements that skip a chunk ending with newline", () => {
		const source = new ReplaceSource(
			new OriginalSource(
				["line1", "line2", "line3", "line4"].join("\n"),
				"file.txt",
			),
		);
		source.replace(6, 17, "X");
		expect(source.source()).toBe("line1\nXline4");
	});

	it("should handle multi-line replacement content", () => {
		const source = new ReplaceSource(
			new OriginalSource("hello world", "file.txt"),
		);
		source.replace(6, 10, "multi\nline\nreplacement");
		expect(source.source()).toBe("hello multi\nline\nreplacement");
	});

	it("should handle a replacement that happens at source end", () => {
		const source = new ReplaceSource(new OriginalSource("hello", "file.txt"));
		source.insert(5, " world");
		source.insert(5, "!");
		expect(source.source()).toBe("hello world!");
	});

	it("should handle replacements ending with newline", () => {
		const source = new ReplaceSource(
			new OriginalSource("abc\ndef\nghi", "file.txt"),
		);
		source.replace(0, 2, "xyz\n");
		expect(source.source()).toBe("xyz\n\ndef\nghi");
	});

	it("should work with RawSource as source (no map)", () => {
		const source = new ReplaceSource(new RawSource("Hello World"));
		source.replace(6, 10, "You");
		expect(source.source()).toBe("Hello You");
		expect(source.sourceAndMap()).toHaveProperty("source", "Hello You");
	});

	it("should expose buffers() reflecting the replaced source", () => {
		const source = new ReplaceSource(new RawSource("Hello World"));
		source.replace(6, 10, "You");
		const buffers = source.buffers();
		expect(Array.isArray(buffers)).toBe(true);
		expect(buffers).toHaveLength(1);
		expect(buffers[0]).toEqual(Buffer.from("Hello You"));
		expect(Buffer.concat(buffers)).toEqual(source.buffer());
	});

	it("should delegate buffers() to the underlying source when no replacements", () => {
		const inner = new RawSource(Buffer.from("untouched"));
		const source = new ReplaceSource(inner);
		const buffers = source.buffers();
		expect(buffers).toHaveLength(1);
		expect(buffers[0]).toBe(inner.buffer());
		expect(source.buffer()).toBe(inner.buffer());
	});
});
