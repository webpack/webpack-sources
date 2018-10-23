var should = require("should");
var OriginalSource = require("../lib/OriginalSource");

describe("OriginalSource", function() {
	it("should handle multiline string", function() {
		var source = new OriginalSource("Line1\n\nLine3\n", "file.js");
		var resultText = source.source();
		var resultMap = source.sourceAndMap({
			columns: true
		});
		var resultListMap = source.sourceAndMap({
			columns: false
		});

		resultText.should.be.eql("Line1\n\nLine3\n");
		resultMap.source.should.be.eql(resultText);
		resultListMap.source.should.be.eql(resultText);
		resultListMap.map.file.should.be.eql(resultMap.map.file);
		resultListMap.map.version.should.be.eql(resultMap.map.version);
		resultMap.map.sources.should.be.eql(["file.js"]);
		resultListMap.map.sources.should.be.eql(resultMap.map.sources);
		resultMap.map.sourcesContent.should.be.eql(["Line1\n\nLine3\n"]);
		resultListMap.map.sourcesContent.should.be.eql(resultMap.map.sourcesContent);
		resultMap.map.mappings.should.be.eql("AAAA;;AAEA");
		resultListMap.map.mappings.should.be.eql("AAAA;AACA;AACA;");
	});

	it("should handle empty string", function() {
		var source = new OriginalSource("", "file.js");
		var resultText = source.source();
		var resultMap = source.sourceAndMap({
			columns: true
		});
		var resultListMap = source.sourceAndMap({
			columns: false
		});

		resultText.should.be.eql("");
		resultMap.source.should.be.eql(resultText);
		resultListMap.source.should.be.eql(resultText);
		resultListMap.map.file.should.be.eql(resultMap.map.file);
		resultListMap.map.version.should.be.eql(resultMap.map.version);
		resultMap.map.sources.should.be.eql([]);
		resultListMap.map.sources.should.be.eql(resultMap.map.sources);
		resultMap.map.mappings.should.be.eql("");
		resultListMap.map.mappings.should.be.eql("");
	});

	it("should omit mappings for columns with node", function() {
		var source = new OriginalSource("Line1\n\nLine3\n", "file.js");
		var resultMap = source.node({
			columns: false
		}).toStringWithSourceMap({
			file: "x"
		}).map.toJSON();

		resultMap.mappings.should.be.eql("AAAA;AACA;AACA");
	});

	it("should return the correct size for binary files", function() {
		var source = new OriginalSource(new ArrayBuffer(256), "file.wasm");
		source.size().should.be.eql(256);
	});

	it("should return the correct size for unicode files", function() {
		var source = new OriginalSource("😋", "file.js");
		source.size().should.be.eql(4);
	});
});
