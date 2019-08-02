var should = require("should");
var SourceMapSource = require("../lib/SourceMapSource");
var OriginalSource = require("../lib/OriginalSource");
var ConcatSource = require("../lib/ConcatSource");
var SourceNode = require("source-map").SourceNode;

describe("SourceMapSource", function() {
	it("map correctly", function() {
		var innerSourceCode = [
			"Hello World",
			"is a test string"
		].join("\n") + "\n";
		var innerSource = new ConcatSource(
			new OriginalSource(innerSourceCode, "hello-world.txt"),
			"Other text\n"
		);

		var source = new SourceNode(null, null, null, [
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

		var sourceR = source.toStringWithSourceMap({
			file: "translated.txt"
		});

		var sourceMapSource1 = new SourceMapSource(sourceR.code, "text", sourceR.map.toJSON(), innerSource.source(), innerSource.map());
		var sourceMapSource2 = new SourceMapSource(sourceR.code, "text", sourceR.map.toJSON(), innerSource.source(), innerSource.map(), true);

		var expectedContent = [
			"Translated: Hallo Welt",
			"ist ein test Text",
			"Anderer Text"
		].join("\n");
		sourceMapSource1.source().should.be.eql(expectedContent)
		sourceMapSource2.source().should.be.eql(expectedContent)

		sourceMapSource1.map().should.be.eql({
			file: "x",
			mappings: "YAAAA,K,CAAMC;AACN,O,MAAU;ACCV,O,CAAM",
			names: [
				"Hello",
				"World"
			],
			sources: [
				"hello-world.txt",
				"text"
			],
			sourcesContent: [
				innerSourceCode,
				innerSource.source()
			],
			version: 3
		});

		sourceMapSource2.map().should.be.eql({
			file: "x",
			mappings: "YAAAA,K,CAAMC;AACN,O,MAAU",
			names: [
				"Hello",
				"World"
			],
			sources: [
				"hello-world.txt"
			],
			sourcesContent: [
				innerSourceCode
			],
			version: 3
		});
	})
});
