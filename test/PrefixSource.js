"use strict";

jest.mock("./__mocks__/createMappingsSerializer");

const crypto = require("crypto");
const { PrefixSource } = require("../");
const { OriginalSource } = require("../");
const { ConcatSource } = require("../");
const { RawSource } = require("../");
const { ReplaceSource } = require("../");
const { withReadableMappings } = require("./helpers");

describe("prefixSource", () => {
	it("should prefix a source", () => {
		const source = new PrefixSource(
			"\t",
			new OriginalSource(
				"console.log('test');console.log('test2');\nconsole.log('test22');\n",
				"console.js",
			),
		);
		const expectedMap1 = {
			version: 3,
			file: "x",
			mappings: "AAAA;AACA",
			names: [],
			sources: ["console.js"],
			sourcesContent: [
				"console.log('test');console.log('test2');\nconsole.log('test22');\n",
			],
		};
		const expectedSource = [
			"\tconsole.log('test');console.log('test2');",
			"\tconsole.log('test22');",
			"",
		].join("\n");
		expect(source.size()).toBe(67);
		expect(source.source()).toEqual(expectedSource);
		expect(
			source.map({
				columns: false,
			}),
		).toEqual(expectedMap1);
		expect(
			source.sourceAndMap({
				columns: false,
			}),
		).toEqual({
			source: expectedSource,
			map: expectedMap1,
		});
		const expectedMap2 = {
			version: 3,
			file: "x",
			mappings: "CAAA,oBAAoB;CACpB",
			names: [],
			sources: ["console.js"],
			sourcesContent: [
				"console.log('test');console.log('test2');\nconsole.log('test22');\n",
			],
		};
		const result = source.sourceAndMap();
		expect(result.source).toEqual(expectedSource);
		expect(withReadableMappings(result.map)).toEqual(
			withReadableMappings(expectedMap2),
		);
		expect(withReadableMappings(source.map())).toEqual(
			withReadableMappings(expectedMap2),
		);
	});

	it("should have consistent source/sourceAndMap behavior", () => {
		const source = new PrefixSource(
			"\t",
			new ConcatSource(
				new OriginalSource("console.log('test');\n", "consoleA.js"),
				new OriginalSource("\nconsole.log('test1');\n\n", "consoleB.js"),
				new OriginalSource("\nconsole.log('test2');\n", "consoleC.js"),
				new OriginalSource("console.log('test3');", "consoleD.js"),
				new OriginalSource("\n", "empty.js"),
				new OriginalSource("console.log('test4');", "consoleE.js"),
			),
		);

		const actualSource = source.source();
		const expectedSource = [
			"\tconsole.log('test');\n",
			"\t\n\tconsole.log('test1');\n\t\n",
			"\t\n\tconsole.log('test2');\n",
			"\tconsole.log('test3');",
			"\n\t",
			"console.log('test4');",
		].join("");

		expect(actualSource).toEqual(expectedSource);
		expect(actualSource).toEqual(source.sourceAndMap().source);
	});

	it("should handle newlines correctly", () => {
		const source = new PrefixSource(
			"*",
			new ConcatSource(
				"Line",
				" and more\n",
				"double nl\n\n",
				"nl\nline\nin\nline\n",
				"\nstart with nl",
				"\n\n\nempty lines",
			),
		);

		expect(source.sourceAndMap().source).toEqual(source.source());
	});

	it("should expose prefix and original source", () => {
		const inner = new OriginalSource("Hello", "file.js");
		const source = new PrefixSource("> ", inner);
		expect(source.getPrefix()).toBe("> ");
		expect(source.original()).toBe(inner);
	});

	it("should update hash consistently", () => {
		const source1 = new PrefixSource(
			"> ",
			new OriginalSource("Hello", "file.js"),
		);
		const source2 = new PrefixSource(
			"> ",
			new OriginalSource("Hello", "file.js"),
		);
		const source3 = new PrefixSource(
			"> ",
			new OriginalSource("World", "file.js"),
		);

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

	it("should accept a raw string as source", () => {
		const source = new PrefixSource("**", "line1\nline2");
		expect(source.source()).toBe("**line1\n**line2");
	});

	it("should accept a Buffer as source", () => {
		const source = new PrefixSource("**", Buffer.from("line1\nline2"));
		expect(source.source()).toBe("**line1\n**line2");
	});

	it("should work with RawSource (no map)", () => {
		const source = new PrefixSource("> ", new RawSource("hello\nworld"));
		expect(source.source()).toBe("> hello\n> world");
	});

	it("should handle empty prefix (prefixOffset = 0)", () => {
		const inner = new OriginalSource("hello\nworld\n", "file.js");
		const source = new PrefixSource("", inner);
		expect(source.source()).toBe("hello\nworld\n");
		expect(source.sourceAndMap().source).toBe("hello\nworld\n");
	});

	it("should expose buffers() that concatenates to the prefixed source", () => {
		const source = new PrefixSource("> ", new RawSource("hello\nworld"));
		const buffers = source.buffers();
		expect(Array.isArray(buffers)).toBe(true);
		expect(Buffer.concat(buffers)).toEqual(Buffer.from("> hello\n> world"));
		expect(Buffer.concat(buffers)).toEqual(source.buffer());
		expect(source.buffer().toString("utf8")).toBe(source.source());
	});

	it("should not emit a trailing prefix buffer when source ends with a newline", () => {
		const source = new PrefixSource("> ", new RawSource("a\n"));
		expect(source.buffer().toString("utf8")).toBe("> a\n");
		expect(source.buffer().toString("utf8")).toBe(source.source());
	});

	it("should emit prefix between consecutive newlines", () => {
		const source = new PrefixSource("> ", new RawSource("a\n\nb"));
		expect(source.buffer().toString("utf8")).toBe("> a\n> \n> b");
		expect(source.buffer().toString("utf8")).toBe(source.source());
	});

	it("should pass through underlying buffers when prefix is empty", () => {
		const inner = new RawSource(Buffer.from("hello"));
		const source = new PrefixSource("", inner);
		const buffers = source.buffers();
		expect(buffers).toHaveLength(1);
		expect(buffers[0]).toBe(inner.buffer());
	});

	it("should produce just the prefix when underlying source is empty", () => {
		const source = new PrefixSource("> ", new RawSource(""));
		expect(source.buffer().toString("utf8")).toBe("> ");
		expect(source.buffer().toString("utf8")).toBe(source.source());
	});

	it("should handle multi-byte utf-8 across newlines", () => {
		const source = new PrefixSource("> ", new RawSource("héllo\nwörld"));
		expect(source.buffer().toString("utf8")).toBe("> héllo\n> wörld");
		expect(source.buffer().toString("utf8")).toBe(source.source());
	});

	it("should reflect mutations to the underlying source on subsequent calls", () => {
		const inner = new ReplaceSource(new RawSource("hello world"));
		const source = new PrefixSource("> ", inner);
		expect(source.source()).toBe("> hello world");
		expect(source.buffer().toString("utf8")).toBe("> hello world");
		expect(Buffer.concat(source.buffers()).toString("utf8")).toBe(
			"> hello world",
		);

		inner.replace(6, 10, "you");

		expect(source.source()).toBe("> hello you");
		expect(source.buffer().toString("utf8")).toBe("> hello you");
		expect(Buffer.concat(source.buffers()).toString("utf8")).toBe(
			"> hello you",
		);
	});
});
