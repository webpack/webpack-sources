jest.mock("../lib/helpers/createMappingsSerializer");
const SourceMapSource = require("../").SourceMapSource;
const OriginalSource = require("../").OriginalSource;
const ConcatSource = require("../").ConcatSource;
const PrefixSource = require("../").PrefixSource;
const ReplaceSource = require("../").ReplaceSource;
const CachedSource = require("../").CachedSource;
const createMappingsSerializer = require("../lib/helpers/createMappingsSerializer");
const SourceNode = require("source-map").SourceNode;
const fs = require("fs");
const path = require("path");
const { withReadableMappings } = require("./helpers");

describe("SourceMapSource", () => {
	it("map correctly", () => {
		const innerSourceCode =
			["Hello World", "is a test string"].join("\n") + "\n";
		const innerSource = new ConcatSource(
			new OriginalSource(innerSourceCode, "hello-world.txt"),
			new OriginalSource("Translate: ", "header.txt"),
			"Other text"
		);

		const source = new SourceNode(null, null, null, [
			"Translated: ",
			new SourceNode(1, 0, "text", "Hallo", "Hello"),
			" ",
			new SourceNode(1, 6, "text", "Welt\n", "World"),
			new SourceNode(2, 0, "text", "ist ein", "nope"),
			" test ",
			new SourceNode(2, 10, "text", "Text\n"),
			new SourceNode(3, 11, "text", "Anderer"),
			" ",
			new SourceNode(3, 17, "text", "Text")
		]);
		source.setSourceContent("text", innerSourceCode);

		const sourceR = source.toStringWithSourceMap({
			file: "translated.txt"
		});

		const sourceMapSource1 = new SourceMapSource(
			sourceR.code,
			"text",
			sourceR.map.toJSON(),
			innerSource.source(),
			innerSource.map()
		);
		const sourceMapSource2 = new SourceMapSource(
			sourceR.code,
			"text",
			sourceR.map.toJSON(),
			innerSource.source(),
			innerSource.map(),
			true
		);

		const expectedContent = [
			"Translated: Hallo Welt",
			"ist ein test Text",
			"Anderer Text"
		].join("\n");
		expect(sourceMapSource1.source()).toEqual(expectedContent);
		expect(sourceMapSource2.source()).toEqual(expectedContent);

		expect(withReadableMappings(sourceMapSource1.map())).toMatchInlineSnapshot(`
		Object {
		  "_mappings": "1:12 -> [hello-world.txt] 1:0 (Hello), :17, :18 -> [hello-world.txt] 1:6 (World)
		2:0 -> [hello-world.txt] 2:0, :7, :13 -> [hello-world.txt] 2:10
		3:0 -> [text] 3:11, :7, :8 -> [text] 3:17",
		  "file": "x",
		  "mappings": "YAAAA,K,CAAMC;AACN,O,MAAU;ACCC,O,CAAM",
		  "names": Array [
		    "Hello",
		    "World",
		  ],
		  "sources": Array [
		    "hello-world.txt",
		    "text",
		  ],
		  "sourcesContent": Array [
		    "Hello World
		is a test string
		",
		    "Hello World
		is a test string
		Translate: Other text",
		  ],
		  "version": 3,
		}
	`);

		expect(withReadableMappings(sourceMapSource2.map())).toMatchInlineSnapshot(`
		Object {
		  "_mappings": "1:12 -> [hello-world.txt] 1:0 (Hello), :17, :18 -> [hello-world.txt] 1:6 (World)
		2:0 -> [hello-world.txt] 2:0, :7, :13 -> [hello-world.txt] 2:10",
		  "file": "x",
		  "mappings": "YAAAA,K,CAAMC;AACN,O,MAAU",
		  "names": Array [
		    "Hello",
		    "World",
		  ],
		  "sources": Array [
		    "hello-world.txt",
		  ],
		  "sourcesContent": Array [
		    "Hello World
		is a test string
		",
		  ],
		  "version": 3,
		}
	`);

		const hash = require("crypto").createHash("sha256");
		sourceMapSource1.updateHash(hash);
		const digest = hash.digest("hex");
		expect(digest).toMatchInlineSnapshot(
			`"a61a2da7f3d541e458b1af9c0ec25d853fb929339d7d8b22361468be67326a52"`
		);

		const clone = new SourceMapSource(...sourceMapSource1.getArgsAsBuffers());
		expect(clone.sourceAndMap()).toEqual(sourceMapSource1.sourceAndMap());

		const hash2 = require("crypto").createHash("sha256");
		clone.updateHash(hash2);
		const digest2 = hash2.digest("hex");
		expect(digest2).toEqual(digest);
	});

	it("should handle null sources and sourcesContent", () => {
		const a = new SourceMapSource("hello world\n", "hello.txt", {
			version: 3,
			sources: [null],
			sourcesContent: [null],
			mappings: "AAAA"
		});
		const b = new SourceMapSource("hello world\n", "hello.txt", {
			version: 3,
			sources: [],
			sourcesContent: [],
			mappings: "AAAA"
		});
		const c = new SourceMapSource("hello world\n", "hello.txt", {
			version: 3,
			sources: ["hello-source.txt"],
			sourcesContent: ["hello world\n"],
			mappings: "AAAA"
		});
		const sources = [a, b, c].map(s => {
			const r = new ReplaceSource(s);
			r.replace(1, 4, "i");
			return r;
		});
		const source = new ConcatSource(...sources);

		expect(source.source()).toMatchInlineSnapshot(`
		"hi world
		hi world
		hi world
		"
	`);
		expect(withReadableMappings(source.map(), source.source()))
			.toMatchInlineSnapshot(`
		Object {
		  "_mappings": "1:0 -> [null] 1:0
		hi world
		^_______
		3:0 -> [hello-source.txt] 1:0, :1 -> [hello-source.txt] 1:1, :2 -> [hello-source.txt] 1:5
		hi world
		^^^_____
		",
		  "file": "x",
		  "mappings": "AAAA;;ACAA,CAAC,CAAI",
		  "names": Array [],
		  "sources": Array [
		    null,
		    "hello-source.txt",
		  ],
		  "sourcesContent": Array [
		    null,
		    "hello world
		",
		  ],
		  "version": 3,
		}
	`);
		expect(
			withReadableMappings(source.map({ columns: false }), source.source())
		).toMatchInlineSnapshot(`
		Object {
		  "_mappings": "1:0 -> [null] 1:0
		hi world
		^_______
		3:0 -> [hello-source.txt] 1:0
		hi world
		^_______
		",
		  "file": "x",
		  "mappings": "AAAA;;ACAA",
		  "names": Array [],
		  "sources": Array [
		    null,
		    "hello-source.txt",
		  ],
		  "sourcesContent": Array [
		    null,
		    "hello world
		",
		  ],
		  "version": 3,
		}
	`);
	});

	it("should handle es6-promise correctly", () => {
		const code = fs.readFileSync(
			path.resolve(__dirname, "fixtures", "es6-promise.js"),
			"utf-8"
		);
		const map = JSON.parse(
			fs.readFileSync(
				path.resolve(__dirname, "fixtures", "es6-promise.map"),
				"utf-8"
			)
		);
		const inner = new SourceMapSource(code, "es6-promise.js", map);
		const source = new ConcatSource(inner, inner);
		expect(source.source()).toBe(code + code);
		expect(source.sourceAndMap().source).toBe(code + code);
	});

	it("should not emit zero sizes mappings when ending with empty mapping", () => {
		const a = new SourceMapSource("hello\n", "a", {
			version: 3,
			mappings: "AAAA;AACA",
			sources: ["hello1"]
		});
		const b = new SourceMapSource("hi", "b", {
			version: 3,
			mappings: "AAAA,EAAE",
			sources: ["hello2"]
		});
		const b2 = new SourceMapSource("hi", "b", {
			version: 3,
			mappings: "AAAA,EAAE",
			sources: ["hello3"]
		});
		const c = new SourceMapSource("", "c", {
			version: 3,
			mappings: "AAAA",
			sources: ["hello4"]
		});
		const source = new ConcatSource(
			a,
			a,
			b,
			b,
			b2,
			b,
			c,
			c,
			b2,
			a,
			b2,
			c,
			a,
			b
		);
		source.sourceAndMap();
		expect(withReadableMappings(source.map(), source.source()))
			.toMatchInlineSnapshot(`
		Object {
		  "_mappings": "1:0 -> [hello1] 1:0
		hello
		^____
		2:0 -> [hello1] 1:0
		hello
		^____
		3:0 -> [hello2] 1:0, :4 -> [hello3] 1:0, :6 -> [hello2] 1:0, :8 -> [hello3] 1:0, :10 -> [hello1] 1:0
		hihihihihihello
		^___^_^_^_^____
		4:0 -> [hello3] 1:0, :2 -> [hello1] 1:0
		hihello
		^_^____
		5:0 -> [hello2] 1:0
		hi
		^_
		",
		  "file": "x",
		  "mappings": "AAAA;AAAA;ACAA,ICAA,EDAA,ECAA,EFAA;AEAA,EFAA;ACAA",
		  "names": Array [],
		  "sources": Array [
		    "hello1",
		    "hello2",
		    "hello3",
		  ],
		  "sourcesContent": undefined,
		  "version": 3,
		}
	`);
		source.sourceAndMap({ columns: true });
		source.map({ columns: true });
		const withReplacements = s => {
			const r = new ReplaceSource(s);
			r.insert(0, "");
			return r;
		};
		withReplacements(source).sourceAndMap();
		withReplacements(source).map();
		withReplacements(source).sourceAndMap({ columns: false });
		withReplacements(source).map({ columns: false });
		const withPrefix = s => new PrefixSource("test", s);
		withPrefix(source).sourceAndMap();
		withPrefix(source).map();
		withPrefix(source).sourceAndMap({ columns: false });
		withPrefix(source).map({ columns: false });
		const testCached = (s, fn) => {
			const c = new CachedSource(s);
			const o = fn(s);
			const a = fn(c);
			expect(a).toEqual(o);
			const b = fn(c);
			expect(b).toEqual(o);
			return b;
		};
		testCached(source, s => s.sourceAndMap());
		testCached(source, s => s.map());
		testCached(source, s => s.sourceAndMap({ columns: false }));
		testCached(source, s => s.map({ columns: false }));
		testCached(withPrefix(source), s => s.sourceAndMap());
		testCached(withPrefix(source), s => s.map());
		testCached(withPrefix(source), s => s.sourceAndMap({ columns: false }));
		testCached(withPrefix(source), s => s.map({ columns: false }));
		testCached(source, s => withPrefix(s).sourceAndMap());
		testCached(source, s => withPrefix(s).map());
		testCached(source, s => withPrefix(s).sourceAndMap({ columns: false }));
		testCached(source, s => withPrefix(s).map({ columns: false }));
	});

	it("should not crash without original source when mapping names", () => {
		const source = new SourceMapSource(
			"h",
			"hello.txt",
			{
				version: 3,
				sources: ["hello.txt"],
				mappings: "AAAAA",
				names: ["hello"]
			},
			"hello",
			{
				version: 3,
				sources: ["hello world.txt"],
				mappings: "AAAA"
			},
			false
		);
		expect(withReadableMappings(source.map())).toMatchInlineSnapshot(`
		Object {
		  "_mappings": "1:0 -> [hello world.txt] 1:0",
		  "file": "x",
		  "mappings": "AAAA",
		  "names": Array [],
		  "sources": Array [
		    "hello world.txt",
		  ],
		  "sourcesContent": undefined,
		  "version": 3,
		}
	`);
	});

	it("should map generated lines to the inner source", () => {
		const m = createMappingsSerializer();
		const m2 = createMappingsSerializer();
		const source = new SourceMapSource(
			"Message: H W!",
			"HELLO_WORLD.txt",
			{
				version: 3,
				sources: ["messages.txt", "HELLO_WORLD.txt"],
				mappings: [
					m(1, 0, 0, 1, 0, 0),
					m(1, 9, 1, 1, 0, 1),
					m(1, 11, 1, 1, 6, 2),
					m(1, 12, -1, -1, -1, -1)
				].join(""),
				names: ["Message", "hello", "world"]
			},
			"HELLO WORLD",
			{
				version: 3,
				sources: ["hello world.txt"],
				mappings: [m2(1, 0, 0, 1, 0, 0), m2(1, 6, -1, -1, -1, -1)].join(""),
				sourcesContent: ["hello world"]
			},
			false
		);
		expect(withReadableMappings(source.sourceAndMap())).toMatchInlineSnapshot(`
		Object {
		  "_mappings": "1:0 -> [messages.txt] 1:0 (Message), :9 -> [hello world.txt] 1:0, :11 -> [HELLO_WORLD.txt] 1:6 (world), :12
		Message: H W!
		^________^_^.
		",
		  "map": Object {
		    "file": "x",
		    "mappings": "AAAAA,SCAA,ECAMC,C",
		    "names": Array [
		      "Message",
		      "world",
		    ],
		    "sources": Array [
		      "messages.txt",
		      "hello world.txt",
		      "HELLO_WORLD.txt",
		    ],
		    "sourcesContent": Array [
		      null,
		      "hello world",
		      "HELLO WORLD",
		    ],
		    "version": 3,
		  },
		  "source": "Message: H W!",
		}
	`);
	});

	it("provides buffer when backed by string", () => {
		const sourceMapSource = new SourceMapSource("source", "name");

		const buffer1 = sourceMapSource.buffer();
		expect(buffer1.length).toBe(6);

		const buffer2 = sourceMapSource.buffer();
		expect(buffer2).toBe(buffer1);
	});

	it("provides buffer when backed by buffer", () => {
		const sourceMapSource = new SourceMapSource(
			Buffer.from("source", "utf-8"),
			"name"
		);

		const buffer1 = sourceMapSource.buffer();
		expect(buffer1.length).toBe(6);

		const buffer2 = sourceMapSource.buffer();
		expect(buffer2).toBe(buffer1);
	});
});
