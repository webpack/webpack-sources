"use strict";

jest.mock("./__mocks__/createMappingsSerializer");

const { ConcatSource } = require("../");
const { RawSource } = require("../");
const { OriginalSource } = require("../");
const { SourceMapSource } = require("../");
const { withReadableMappings } = require("./helpers");

describe("concatSource", () => {
	it("should concat two sources", () => {
		const source = new ConcatSource(
			new RawSource("Hello World\n"),
			new OriginalSource(
				"console.log('test');\nconsole.log('test2');\n",
				"console.js",
			),
		);
		source.add(new OriginalSource("Hello2\n", "hello.md"));
		const expectedMap1 = {
			version: 3,
			file: "x",
			mappings: ";AAAA;AACA;ACDA",
			names: [],
			sources: ["console.js", "hello.md"],
			sourcesContent: [
				"console.log('test');\nconsole.log('test2');\n",
				"Hello2\n",
			],
		};
		const expectedSource = [
			"Hello World",
			"console.log('test');",
			"console.log('test2');",
			"Hello2",
			"",
		].join("\n");
		expect(source.size()).toBe(62);
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
			mappings: ";AAAA;AACA;ACDA",
			names: [],
			sources: ["console.js", "hello.md"],
			sourcesContent: [
				"console.log('test');\nconsole.log('test2');\n",
				"Hello2\n",
			],
		};
		expect(source.map()).toEqual(expectedMap2);
		expect(source.sourceAndMap()).toEqual({
			source: expectedSource,
			map: expectedMap2,
		});
	});

	it("should be able to handle strings for all methods", () => {
		const source = new ConcatSource(
			new RawSource("Hello World\n"),
			new OriginalSource(
				"console.log('test');\nconsole.log('test2');\n",
				"console.js",
			),
		);
		const innerSource = new ConcatSource("(", "'string'", ")");
		innerSource.buffer(); // force optimization
		source.add("console");
		source.add(".");
		source.add("log");
		source.add(innerSource);
		const expectedSource = [
			"Hello World",
			"console.log('test');",
			"console.log('test2');",
			"console.log('string')",
		].join("\n");
		const expectedMap1 = {
			version: 3,
			file: "x",
			mappings: ";AAAA;AACA",
			names: [],
			sources: ["console.js"],
			sourcesContent: ["console.log('test');\nconsole.log('test2');\n"],
		};
		expect(source.size()).toBe(76);
		expect(source.source()).toEqual(expectedSource);
		expect(source.buffer()).toEqual(Buffer.from(expectedSource, "utf8"));
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

		const hash = require("crypto").createHash("sha256");

		source.updateHash(hash);
		const digest = hash.digest("hex");
		expect(digest).toBe(
			"183e6e9393eddb8480334aebeebb3366d6cce0124bc429c6e9246cc216167cb2",
		);

		const hash2 = require("crypto").createHash("sha256");

		const source2 = new ConcatSource(
			"Hello World\n",
			new OriginalSource(
				"console.log('test');\nconsole.log('test2');\n",
				"console.js",
			),
			"console.log('string')",
		);
		source2.updateHash(hash2);
		expect(hash2.digest("hex")).toEqual(digest);

		const clone = new ConcatSource();
		clone.addAllSkipOptimizing(source.getChildren());

		expect(clone.source()).toEqual(source.source());

		const hash3 = require("crypto").createHash("sha256");

		clone.updateHash(hash3);
		expect(hash3.digest("hex")).toEqual(digest);
	});

	it("should return null as map when only generated code is concatenated", () => {
		const source = new ConcatSource(
			"Hello World\n",
			new RawSource("Hello World\n"),
			"",
		);

		const resultText = source.source();
		const resultMap = source.sourceAndMap({
			columns: true,
		});
		const resultListMap = source.sourceAndMap({
			columns: false,
		});

		expect(resultText).toBe("Hello World\nHello World\n");
		expect(resultMap.source).toEqual(resultText);
		expect(resultListMap.source).toEqual(resultText);
		expect(resultListMap.map).toBeNull();
		expect(resultMap.map).toBeNull();
	});

	it("should allow to concatenate in a single line", () => {
		const source = new ConcatSource(
			new OriginalSource("Hello", "hello.txt"),
			" ",
			new OriginalSource("World ", "world.txt"),
			"is here\n",
			new OriginalSource("Hello\n", "hello.txt"),
			" \n",
			new OriginalSource("World\n", "world.txt"),
			"is here",
		);

		expect(withReadableMappings(source.map())).toMatchInlineSnapshot(`
		Object {
		  "_mappings": "1:0 -> [hello.txt] 1:0, :5, :6 -> [world.txt] 1:0, :12
		2:0 -> [hello.txt] 1:0
		4:0 -> [world.txt] 1:0",
		  "file": "x",
		  "mappings": "AAAA,K,CCAA,M;ADAA;;ACAA",
		  "names": Array [],
		  "sources": Array [
		    "hello.txt",
		    "world.txt",
		  ],
		  "sourcesContent": Array [
		    "Hello",
		    "World ",
		  ],
		  "version": 3,
		}
	`);
	});

	it("should allow to concat buffer sources", () => {
		const source = new ConcatSource("a", new RawSource(Buffer.from("b")), "c");
		expect(source.sourceAndMap()).toMatchInlineSnapshot(`
		Object {
		  "map": null,
		  "source": "abc",
		}
	`);
	});

	it("should concat a SourceLike child without a buffer() method that returns a Buffer", () => {
		const customBuffer = Buffer.from("custom-content");
		const customSource = {
			source() {
				return customBuffer;
			},
			size() {
				return customBuffer.length;
			},
		};
		const source = new ConcatSource(customSource, new RawSource("-after"));
		const result = source.buffer();
		expect(result).toEqual(
			Buffer.concat([customBuffer, Buffer.from("-after")]),
		);
	});

	it("should expose individual buffers via buffers() without concatenating", () => {
		const a = new RawSource(Buffer.from("a"));
		const b = new RawSource(Buffer.from("b"));
		const c = new RawSource(Buffer.from("c"));
		const source = new ConcatSource(a, b, c);
		const buffers = source.buffers();
		expect(Array.isArray(buffers)).toBe(true);
		expect(buffers).toHaveLength(3);
		expect(buffers[0]).toEqual(Buffer.from("a"));
		expect(buffers[1]).toEqual(Buffer.from("b"));
		expect(buffers[2]).toEqual(Buffer.from("c"));
		expect(Buffer.concat(buffers)).toEqual(source.buffer());
	});

	it("should flatten nested ConcatSource buffers() into a flat Buffer[]", () => {
		const inner = new ConcatSource(
			new RawSource(Buffer.from("x")),
			new RawSource(Buffer.from("y")),
		);
		const outer = new ConcatSource(new RawSource(Buffer.from("a")), inner);
		const buffers = outer.buffers();
		expect(buffers).toHaveLength(3);
		expect(Buffer.concat(buffers).toString("utf8")).toBe("axy");
	});

	it("should fall back to buffer()/source() in buffers() for SourceLike children", () => {
		const customBuffer = Buffer.from("custom");
		const bufferOnly = {
			source() {
				return customBuffer;
			},
			buffer() {
				return customBuffer;
			},
			size() {
				return customBuffer.length;
			},
		};
		const sourceOnly = {
			source() {
				return Buffer.from("more");
			},
			size() {
				return 4;
			},
		};
		const source = new ConcatSource(bufferOnly, sourceOnly);
		const buffers = source.buffers();
		expect(buffers).toHaveLength(2);
		expect(buffers[0]).toBe(customBuffer);
		expect(buffers[1]).toEqual(Buffer.from("more"));
	});

	it("should concat a SourceLike child where source() returns a string (no buffer())", () => {
		const customSource = {
			source() {
				return "custom-content";
			},
			size() {
				return "custom-content".length;
			},
		};
		const source = new ConcatSource(customSource, new RawSource("-after"));
		const result = source.buffer();
		expect(result).toEqual(
			Buffer.concat([Buffer.from("custom-content"), Buffer.from("-after")]),
		);
	});

	it("should optimize nested string-only ConcatSources across re-optimization", () => {
		// Create two ConcatSources that produce RawSource (kept in stringsAsRawSources)
		const c1 = new ConcatSource("a", "b");
		c1.source(); // triggers _optimize, putting its RawSource("ab") into stringsAsRawSources

		const c2 = new ConcatSource("c", "d");
		c2.source(); // same, puts RawSource("cd") into stringsAsRawSources

		const merged = new ConcatSource();
		merged.add(c1); // flatten c1's children
		merged.add("x");
		merged.add(c2);
		merged.add("y");
		merged.add(c1);
		expect(merged.source()).toBe("abxcdyab");
	});

	it("should re-optimize when raw source followed by regular source", () => {
		const c1 = new ConcatSource("a", "b");
		c1.source(); // places RawSource into stringsAsRawSources
		const regular = new OriginalSource("Z", "z.js");
		const merged = new ConcatSource();
		merged.add(c1); // flatten
		merged.add(regular);
		expect(merged.source()).toBe("abZ");
		expect(merged.getChildren()).toHaveLength(2);
	});

	it("should reflect empty ConcatSource", () => {
		const source = new ConcatSource();
		expect(source.source()).toBe("");
		expect(source.size()).toBe(0);
		expect(source.buffer()).toEqual(Buffer.alloc(0));
	});

	it("should flatten nested ConcatSource via add()", () => {
		const inner = new ConcatSource("a", "b");
		const outer = new ConcatSource();
		outer.add(inner);
		outer.add("c");
		expect(outer.source()).toBe("abc");
	});

	it("should optimize on first getChildren() call", () => {
		const source = new ConcatSource("a", "b", new RawSource("c"));
		// Call getChildren without first calling source()/size()/buffer()
		const children = source.getChildren();
		expect(children.length).toBeGreaterThan(0);
	});

	it("should handle column mapping correctly with missing sources", () => {
		const source = new ConcatSource(
			"/*! For license information please see main.js.LICENSE.txt */",
		);
		const innerSource = "ab\nc";
		const innerMap = {
			names: [],
			file: "x",
			version: 3,
			sources: ["main.js"],
			sourcesContent: ["a\nc"],
			mappings: "AAAA,CCAA;ADCA",
			// ______________↑ The column mapping (CCAA) references one missing source
		};
		source.add(new SourceMapSource(innerSource, "main.js", innerMap));
		const expected = {
			source:
				"/*! For license information please see main.js.LICENSE.txt */ab\nc",
			map: {
				version: 3,
				file: "x",
				mappings: "6DAAA,C;AACA",
				sources: ["main.js"],
				sourcesContent: ["a\nc"],
				names: [],
			},
		};
		expect(
			source.sourceAndMap({
				columns: true,
			}),
		).toEqual({
			source: expected.source,
			map: expected.map,
		});
	});
});
