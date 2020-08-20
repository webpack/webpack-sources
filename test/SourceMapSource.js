var SourceMapSource = require("../").SourceMapSource;
var OriginalSource = require("../").OriginalSource;
var ConcatSource = require("../").ConcatSource;
var SourceNode = require("source-map").SourceNode;

describe("SourceMapSource", function() {
	it("map correctly", function() {
		var innerSourceCode = ["Hello World", "is a test string"].join("\n") + "\n";
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

		var sourceMapSource1 = new SourceMapSource(
			sourceR.code,
			"text",
			sourceR.map.toJSON(),
			innerSource.source(),
			innerSource.map()
		);
		var sourceMapSource2 = new SourceMapSource(
			sourceR.code,
			"text",
			sourceR.map.toJSON(),
			innerSource.source(),
			innerSource.map(),
			true
		);

		var expectedContent = [
			"Translated: Hallo Welt",
			"ist ein test Text",
			"Anderer Text"
		].join("\n");
		sourceMapSource1.source().should.be.eql(expectedContent);
		sourceMapSource2.source().should.be.eql(expectedContent);

		sourceMapSource1.map().should.be.eql({
			file: "x",
			mappings: "YAAAA,K,CAAMC;AACN,O,MAAU;ACCV,O,CAAM",
			names: ["Hello", "World"],
			sources: ["hello-world.txt", "text"],
			sourcesContent: [innerSourceCode, innerSource.source()],
			version: 3
		});

		sourceMapSource2.map().should.be.eql({
			file: "x",
			mappings: "YAAAA,K,CAAMC;AACN,O,MAAU",
			names: ["Hello", "World"],
			sources: ["hello-world.txt"],
			sourcesContent: [innerSourceCode],
			version: 3
		});

		var hash = require("crypto").createHash("sha256");
		sourceMapSource1.updateHash(hash);
		var digest = hash.digest("hex");
		digest.should.be.eql(
			"c46f63c0329381f89b8882d60964808e95380dbac726c343a765200355875147"
		);

		const clone = new SourceMapSource(...sourceMapSource1.getArgsAsBuffers());
		clone.sourceAndMap().should.be.eql(sourceMapSource1.sourceAndMap());

		var hash2 = require("crypto").createHash("sha256");
		clone.updateHash(hash2);
		var digest2 = hash2.digest("hex");
		digest2.should.be.eql(digest);
	});
});
