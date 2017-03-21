var should = require("should");
var ReplaceSource = require("../lib/ReplaceSource");
var RawSource = require("../lib/RawSource");
var OriginalSource = require("../lib/OriginalSource");

describe("ReplaceSource", function() {
	it("should replace correctly", function() {
		var line1, line2, line3, line4, line5;
		var source = new ReplaceSource(
			new OriginalSource([
				line1 = "Hello World!",
				line2 = "{}",
				line3 = "Line 3",
				line4 = "Line 4",
				line5 = "Line 5",
				line6 = "Last",
				"Line"
			].join("\n"), "file.txt")
		);
		var startLine3 = line1.length + line2.length + 2;
		var startLine6 = startLine3 + line3.length + line4.length + line5.length + 3;
		source.replace(startLine3, startLine3 + line3.length + line4.length + line5.length + 2, "");
		source.replace(1, 4, "i ");
		source.replace(1, 4, "bye");
		source.replace(7, 7, "0000");
		source.insert(line1.length + 2, "\n Multi Line\n");
		source.replace(startLine6 + 4, startLine6 + 4, " ");
		var originalSource = source.original();
		var originalText = originalSource.source();
		var resultText = source.source();
		var resultMap = source.sourceAndMap({
			columns: true
		});
		var resultListMap = source.sourceAndMap({
			columns: false
		});

		originalSource.should.be.eql(source._source);
		originalText.should.be.eql("Hello World!\n{}\nLine 3\nLine 4\nLine 5\nLast\nLine");
		resultText.should.be.eql("Hi bye W0000rld!\n{\n Multi Line\n}\nLast Line");
		resultMap.source.should.be.eql(resultText);
		resultListMap.source.should.be.eql(resultText);
		resultListMap.map.file.should.be.eql(resultMap.map.file);
		resultListMap.map.version.should.be.eql(resultMap.map.version);
		resultListMap.map.sources.should.be.eql(resultMap.map.sources);
		resultListMap.map.sourcesContent.should.be.eql(resultMap.map.sourcesContent);
		resultListMap.map.mappings.should.be.eql("AAAA;AACA;AAAA;AAAA;AAIA,KACA");
	});
});
