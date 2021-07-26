const SourceMapSource = require("../").SourceMapSource;
const OriginalSource = require("../").OriginalSource;
const ConcatSource = require("../").ConcatSource;
const SourceNode = require("source-map").SourceNode;
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
		  "mappings": "YCAAA,K,CAAMC;AACN,O,MAAU;ADCC,O,CAAM",
		  "names": Array [
		    "Hello",
		    "World",
		  ],
		  "sources": Array [
		    "text",
		    "hello-world.txt",
		  ],
		  "sourcesContent": Array [
		    "Hello World
		is a test string
		Translate: Other text",
		    "Hello World
		is a test string
		",
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
});
