const SourceMapSource = require("../").SourceMapSource;
const OriginalSource = require("../").OriginalSource;
const ConcatSource = require("../").ConcatSource;
const SourceNode = require("@benthemonkey/source-map").SourceNode;

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

		expect(sourceMapSource1.map()).toEqual({
			file: "x",
			mappings: "YAAAA,K,CAAMC;AACN,O,MAAU;ACCC,O,CAAM",
			names: ["Hello", "World"],
			sources: ["hello-world.txt", "text"],
			sourcesContent: [innerSourceCode, innerSource.source()],
			version: 3
		});

		expect(sourceMapSource2.map()).toEqual({
			file: "x",
			mappings: "YAAAA,K,CAAMC;AACN,O,MAAU",
			names: ["Hello", "World"],
			sources: ["hello-world.txt"],
			sourcesContent: [innerSourceCode],
			version: 3
		});

		const hash = require("crypto").createHash("sha256");
		sourceMapSource1.updateHash(hash);
		const digest = hash.digest("hex");
		expect(digest).toBe(
			"2de42bc8972534c146d0fadce8288cd9803c53fbd72bdfbbff7f062f6748e01e"
		);

		const clone = new SourceMapSource(...sourceMapSource1.getArgsAsBuffers());
		expect(clone.sourceAndMap()).toEqual(sourceMapSource1.sourceAndMap());

		const hash2 = require("crypto").createHash("sha256");
		clone.updateHash(hash2);
		const digest2 = hash2.digest("hex");
		expect(digest2).toEqual(digest);
	});
});
