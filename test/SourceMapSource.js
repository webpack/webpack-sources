const SourceMapSource = require("../").SourceMapSource;
const OriginalSource = require("../").OriginalSource;
const ConcatSource = require("../").ConcatSource;
const SourceNode = require("source-map").SourceNode;

describe("SourceMapSource", () => {
	it("map correctly", () => {
		const innerSourceCode =
			["Hello World", "is a test string"].join("\n") + "\n";
		const innerSource = new ConcatSource(
			new OriginalSource(innerSourceCode, "hello-world.txt"),
			"Other text\n"
		);

		const source = new SourceNode(null, null, null, [
			"Translated: ",
			new SourceNode(1, 0, "text", "Hallo", "Hello"),
			" ",
			new SourceNode(1, 6, "text", "Welt\n", "World"),
			new SourceNode(2, 0, "text", "ist ein", "nope"),
			" test ",
			new SourceNode(2, 10, "text", "Text\n"),
			new SourceNode(3, 0, "text", "Anderer"),
			" ",
			new SourceNode(3, 6, "text", "Text")
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
			mappings: "YAAAA,K,CAAMC;AACN,O,MAAU;ACCV,O,CAAM",
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
			"c46f63c0329381f89b8882d60964808e95380dbac726c343a765200355875147"
		);

		const clone = new SourceMapSource(...sourceMapSource1.getArgsAsBuffers());
		expect(clone.sourceAndMap()).toEqual(sourceMapSource1.sourceAndMap());

		const hash2 = require("crypto").createHash("sha256");
		clone.updateHash(hash2);
		const digest2 = hash2.digest("hex");
		expect(digest2).toEqual(digest);
	});
});
