var should = require("should");
var ReplaceSource = require("../lib/ReplaceSource");
var RawSource = require("../lib/RawSource");
var OriginalSource = require("../lib/OriginalSource");
var validate = require('sourcemap-validator');

describe("ReplaceSource", function() {
	it("should replace correctly", function() {
		var line1, line2, line3, line4, line5, line6;
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
		resultMap.map.mappings.should.be.eql("AAAA,CAAC,EAAI,KAAE,IAAC;AACR,CAAC;AAAA;AAAA;AAID,IAAI,CACJ");
		resultListMap.map.mappings.should.be.eql("AAAA;AACA;AAAA;AAAA;AAIA,KACA");
	});

	it("should replace multiple items correctly", function() {
		var line1, line2;
		var source = new ReplaceSource(
			new OriginalSource([
				line1 = "Hello",
				line2 = "World!"
			].join("\n"), "file.txt")
		);
		source.insert(0, "Message: ");
		source.replace(2, line1.length + 4, "y A");
		var resultText = source.source();
		var resultMap = source.sourceAndMap({
			columns: true
		});
		var resultListMap = source.sourceAndMap({
			columns: false
		});

		resultText.should.be.eql("Message: Hey Ad!");
		resultMap.source.should.be.eql(resultText);
		resultListMap.source.should.be.eql(resultText);
		resultListMap.map.file.should.be.eql(resultMap.map.file);
		resultListMap.map.version.should.be.eql(resultMap.map.version);
		resultListMap.map.sources.should.be.eql(resultMap.map.sources);
		resultListMap.map.sourcesContent.should.be.eql(resultMap.map.sourcesContent);
		resultMap.map.mappings.should.be.eql("AAAA,WAAE,GACE");
		resultListMap.map.mappings.should.be.eql("AAAA,cACA");
	});

	it("should prepend items correctly", function() {
		var source = new ReplaceSource(
			new OriginalSource("Line 1", "file.txt")
		);
		source.insert(-1, "Line -1\n");
		source.insert(-1, "Line 0\n");
		var resultText = source.source();
		var resultMap = source.sourceAndMap({
			columns: true
		});
		var resultListMap = source.sourceAndMap({
			columns: false
		});

		resultText.should.be.eql("Line -1\nLine 0\nLine 1");
		resultMap.source.should.be.eql(resultText);
		resultListMap.source.should.be.eql(resultText);
		resultListMap.map.file.should.be.eql(resultMap.map.file);
		resultListMap.map.version.should.be.eql(resultMap.map.version);
		resultListMap.map.sources.should.be.eql(resultMap.map.sources);
		resultListMap.map.sourcesContent.should.be.eql(resultMap.map.sourcesContent);
		resultMap.map.mappings.should.be.eql("AAAA;AAAA;AAAA");
		resultListMap.map.mappings.should.be.eql("AAAA;AAAA;AAAA");
	});

	it("should prepend items with replace at start correctly", function() {
		var source = new ReplaceSource(
			new OriginalSource([
				"Line 1",
				"Line 2"
			].join("\n"), "file.txt")
		);
		source.insert(-1, "Line 0\n");
		source.replace(0, 5, "Hello");
		var resultText = source.source();
		var resultMap = source.sourceAndMap({
			columns: true
		});
		var resultListMap = source.sourceAndMap({
			columns: false
		});

		resultText.should.be.eql("Line 0\nHello\nLine 2");
		resultMap.source.should.be.eql(resultText);
		resultListMap.source.should.be.eql(resultText);
		resultListMap.map.file.should.be.eql(resultMap.map.file);
		resultListMap.map.version.should.be.eql(resultMap.map.version);
		resultListMap.map.sources.should.be.eql(resultMap.map.sources);
		resultListMap.map.sourcesContent.should.be.eql(resultMap.map.sourcesContent);
		resultMap.map.mappings.should.be.eql("AAAA;AAAA,KAAM;AACN");
		resultListMap.map.mappings.should.be.eql("AAAA;AAAA;AACA");
	});

	it("should append items correctly", function() {
		var line1;
		var source = new ReplaceSource(
			new OriginalSource(line1 = "Line 1\n", "file.txt")
		);
		source.insert(line1.length + 1, "Line 2\n");
		var resultText = source.source();
		var resultMap = source.sourceAndMap({
			columns: true
		});
		var resultListMap = source.sourceAndMap({
			columns: false
		});

		resultText.should.be.eql("Line 1\nLine 2\n");
		resultMap.source.should.be.eql(resultText);
		resultListMap.source.should.be.eql(resultText);
		resultListMap.map.file.should.be.eql(resultMap.map.file);
		resultListMap.map.version.should.be.eql(resultMap.map.version);
		resultListMap.map.sources.should.be.eql(resultMap.map.sources);
		resultListMap.map.sourcesContent.should.be.eql(resultMap.map.sourcesContent);
		resultMap.map.mappings.should.be.eql("AAAA");
		resultListMap.map.mappings.should.be.eql("AAAA;;");
	});

	it("should produce correct source map", function() {
		var bootstrapCode = '   var hello\n   var world\n';

		should(function() {
			var source = new ReplaceSource(new OriginalSource(bootstrapCode, "file.js"));
			source.replace(7, 11, 'h', 'incorrect');
			source.replace(20, 24, 'w', 'identifiers');
			var resultMap = source.sourceAndMap();
			validate(resultMap.source, JSON.stringify(resultMap.map));
		}).throw();

		var source = new ReplaceSource(new OriginalSource(bootstrapCode, "file.js"));
		source.replace(7, 11, 'h', 'hello');
		source.replace(20, 24, 'w', 'world');
		var resultMap = source.sourceAndMap();
		validate(resultMap.source, JSON.stringify(resultMap.map));

	});
});
