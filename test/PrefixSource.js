"use strict";

const assert = require("assert");
const crypto = require("crypto");
const { describe, it } = require("node:test");
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
		assert.strictEqual(source.size(), 67);
		assert.deepStrictEqual(source.source(), expectedSource);
		assert.deepStrictEqual(
			source.map({
				columns: false,
			}),
			expectedMap1,
		);
		assert.deepStrictEqual(
			source.sourceAndMap({
				columns: false,
			}),
			{
				source: expectedSource,
				map: expectedMap1,
			},
		);
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
		assert.deepStrictEqual(result.source, expectedSource);
		assert.deepStrictEqual(
			withReadableMappings(result.map),
			withReadableMappings(expectedMap2),
		);
		assert.deepStrictEqual(
			withReadableMappings(source.map()),
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

		assert.deepStrictEqual(actualSource, expectedSource);
		assert.deepStrictEqual(actualSource, source.sourceAndMap().source);
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

		assert.deepStrictEqual(source.sourceAndMap().source, source.source());
	});

	it("should expose prefix and original source", () => {
		const inner = new OriginalSource("Hello", "file.js");
		const source = new PrefixSource("> ", inner);
		assert.strictEqual(source.getPrefix(), "> ");
		assert.strictEqual(source.original(), inner);
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

		assert.strictEqual(digest1, digest2);
		assert.notStrictEqual(digest1, digest3);
	});

	it("should accept a raw string as source", () => {
		const source = new PrefixSource("**", "line1\nline2");
		assert.strictEqual(source.source(), "**line1\n**line2");
	});

	it("should accept a Buffer as source", () => {
		const source = new PrefixSource("**", Buffer.from("line1\nline2"));
		assert.strictEqual(source.source(), "**line1\n**line2");
	});

	it("should work with RawSource (no map)", () => {
		const source = new PrefixSource("> ", new RawSource("hello\nworld"));
		assert.strictEqual(source.source(), "> hello\n> world");
	});

	it("should handle empty prefix (prefixOffset = 0)", () => {
		const inner = new OriginalSource("hello\nworld\n", "file.js");
		const source = new PrefixSource("", inner);
		assert.strictEqual(source.source(), "hello\nworld\n");
		assert.strictEqual(source.sourceAndMap().source, "hello\nworld\n");
	});

	it("should expose buffers() that concatenates to the prefixed source", () => {
		const source = new PrefixSource("> ", new RawSource("hello\nworld"));
		const buffers = source.buffers();
		assert.strictEqual(Array.isArray(buffers), true);
		assert.deepStrictEqual(
			Buffer.concat(buffers),
			Buffer.from("> hello\n> world"),
		);
		assert.deepStrictEqual(Buffer.concat(buffers), source.buffer());
		assert.strictEqual(source.buffer().toString("utf8"), source.source());
	});

	it("should not emit a trailing prefix buffer when source ends with a newline", () => {
		const source = new PrefixSource("> ", new RawSource("a\n"));
		assert.strictEqual(source.buffer().toString("utf8"), "> a\n");
		assert.strictEqual(source.buffer().toString("utf8"), source.source());
	});

	it("should emit prefix between consecutive newlines", () => {
		const source = new PrefixSource("> ", new RawSource("a\n\nb"));
		assert.strictEqual(source.buffer().toString("utf8"), "> a\n> \n> b");
		assert.strictEqual(source.buffer().toString("utf8"), source.source());
	});

	it("should pass through underlying buffers when prefix is empty", () => {
		const inner = new RawSource(Buffer.from("hello"));
		const source = new PrefixSource("", inner);
		const buffers = source.buffers();
		assert.strictEqual(buffers.length, 1);
		assert.strictEqual(buffers[0], inner.buffer());
	});

	it("should produce just the prefix when underlying source is empty", () => {
		const source = new PrefixSource("> ", new RawSource(""));
		assert.strictEqual(source.buffer().toString("utf8"), "> ");
		assert.strictEqual(source.buffer().toString("utf8"), source.source());
	});

	it("should handle multi-byte utf-8 across newlines", () => {
		const source = new PrefixSource("> ", new RawSource("héllo\nwörld"));
		assert.strictEqual(source.buffer().toString("utf8"), "> héllo\n> wörld");
		assert.strictEqual(source.buffer().toString("utf8"), source.source());
	});

	it("should reflect mutations to the underlying source on subsequent calls", () => {
		const inner = new ReplaceSource(new RawSource("hello world"));
		const source = new PrefixSource("> ", inner);
		assert.strictEqual(source.source(), "> hello world");
		assert.strictEqual(source.buffer().toString("utf8"), "> hello world");
		assert.strictEqual(
			Buffer.concat(source.buffers()).toString("utf8"),
			"> hello world",
		);

		inner.replace(6, 10, "you");

		assert.strictEqual(source.source(), "> hello you");
		assert.strictEqual(source.buffer().toString("utf8"), "> hello you");
		assert.strictEqual(
			Buffer.concat(source.buffers()).toString("utf8"),
			"> hello you",
		);
	});
});
