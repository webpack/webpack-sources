jest.mock("../lib/helpers/createMappingsSerializer");
const ConcatSource = require("../").ConcatSource;
const RawSource = require("../").RawSource;
const OriginalSource = require("../").OriginalSource;
const { withReadableMappings } = require("./helpers");

describe("ConcatSource", () => {
	it("should concat two sources", () => {
		const source = new ConcatSource(
			new RawSource("Hello World\n"),
			new OriginalSource(
				"console.log('test');\nconsole.log('test2');\n",
				"console.js"
			)
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
				"Hello2\n"
			]
		};
		const expectedSource = [
			"Hello World",
			"console.log('test');",
			"console.log('test2');",
			"Hello2",
			""
		].join("\n");
		expect(source.size()).toBe(62);
		expect(source.source()).toEqual(expectedSource);
		expect(
			source.map({
				columns: false
			})
		).toEqual(expectedMap1);
		expect(
			source.sourceAndMap({
				columns: false
			})
		).toEqual({
			source: expectedSource,
			map: expectedMap1
		});

		const expectedMap2 = {
			version: 3,
			file: "x",
			mappings: ";AAAA;AACA;ACDA",
			names: [],
			sources: ["console.js", "hello.md"],
			sourcesContent: [
				"console.log('test');\nconsole.log('test2');\n",
				"Hello2\n"
			]
		};
		expect(source.map()).toEqual(expectedMap2);
		expect(source.sourceAndMap()).toEqual({
			source: expectedSource,
			map: expectedMap2
		});
	});

	it("should be able to handle strings for all methods", () => {
		const source = new ConcatSource(
			new RawSource("Hello World\n"),
			new OriginalSource(
				"console.log('test');\nconsole.log('test2');\n",
				"console.js"
			)
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
			"console.log('string')"
		].join("\n");
		const expectedMap1 = {
			version: 3,
			file: "x",
			mappings: ";AAAA;AACA",
			names: [],
			sources: ["console.js"],
			sourcesContent: ["console.log('test');\nconsole.log('test2');\n"]
		};
		expect(source.size()).toBe(76);
		expect(source.source()).toEqual(expectedSource);
		expect(source.buffer()).toEqual(Buffer.from(expectedSource, "utf-8"));
		expect(
			source.map({
				columns: false
			})
		).toEqual(expectedMap1);
		expect(
			source.sourceAndMap({
				columns: false
			})
		).toEqual({
			source: expectedSource,
			map: expectedMap1
		});

		const hash = require("crypto").createHash("sha256");
		source.updateHash(hash);
		const digest = hash.digest("hex");
		expect(digest).toBe(
			"183e6e9393eddb8480334aebeebb3366d6cce0124bc429c6e9246cc216167cb2"
		);

		const hash2 = require("crypto").createHash("sha256");
		const source2 = new ConcatSource(
			"Hello World\n",
			new OriginalSource(
				"console.log('test');\nconsole.log('test2');\n",
				"console.js"
			),
			"console.log('string')"
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
			""
		);

		const resultText = source.source();
		const resultMap = source.sourceAndMap({
			columns: true
		});
		const resultListMap = source.sourceAndMap({
			columns: false
		});

		expect(resultText).toBe("Hello World\nHello World\n");
		expect(resultMap.source).toEqual(resultText);
		expect(resultListMap.source).toEqual(resultText);
		expect(resultListMap.map).toBe(null);
		expect(resultMap.map).toBe(null);
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
			"is here"
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
});
