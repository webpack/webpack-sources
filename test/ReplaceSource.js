var ReplaceSource = require("../").ReplaceSource;
var OriginalSource = require("../").OriginalSource;
var validate = require("sourcemap-validator");

describe("ReplaceSource", () => {
	it("should replace correctly", () => {
		var line1, line2, line3, line4, line5;
		var source = new ReplaceSource(
			new OriginalSource(
				[
					(line1 = "Hello World!"),
					(line2 = "{}"),
					(line3 = "Line 3"),
					(line4 = "Line 4"),
					(line5 = "Line 5"),
					"Last",
					"Line"
				].join("\n"),
				"file.txt"
			)
		);
		var startLine3 = line1.length + line2.length + 2;
		var startLine6 =
			startLine3 + line3.length + line4.length + line5.length + 3;
		source.replace(
			startLine3,
			startLine3 + line3.length + line4.length + line5.length + 2,
			""
		);
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

		expect(originalSource).toEqual(source._source);
		expect(originalText).toBe(
			"Hello World!\n{}\nLine 3\nLine 4\nLine 5\nLast\nLine"
		);
		expect(resultText).toBe("Hi bye W0000rld!\n{\n Multi Line\n}\nLast Line");
		expect(resultMap.source).toEqual(resultText);
		expect(resultListMap.source).toEqual(resultText);
		expect(resultListMap.map.file).toEqual(resultMap.map.file);
		expect(resultListMap.map.version).toEqual(resultMap.map.version);
		expect(resultListMap.map.sources).toEqual(resultMap.map.sources);
		expect(resultListMap.map.sourcesContent).toEqual(
			resultMap.map.sourcesContent
		);
		expect(resultMap.map.mappings).toBe(
			"AAAA,CAAC,EAAI,KAAE,IAAC;AACR,CAAC;AAAA;AAAA;AAID,IAAI,CACJ"
		);
		expect(resultListMap.map.mappings).toBe("AAAA;AACA;AAAA;AAAA;AAIA,KACA");
	});

	it("should replace multiple items correctly", () => {
		var line1;
		var source = new ReplaceSource(
			new OriginalSource([(line1 = "Hello"), "World!"].join("\n"), "file.txt")
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

		expect(resultText).toBe("Message: Hey Ad!");
		expect(resultMap.source).toEqual(resultText);
		expect(resultListMap.source).toEqual(resultText);
		expect(resultListMap.map.file).toEqual(resultMap.map.file);
		expect(resultListMap.map.version).toEqual(resultMap.map.version);
		expect(resultListMap.map.sources).toEqual(resultMap.map.sources);
		expect(resultListMap.map.sourcesContent).toEqual(
			resultMap.map.sourcesContent
		);
		expect(resultMap.map.mappings).toBe("AAAA,WAAE,GACE");
		expect(resultListMap.map.mappings).toBe("AAAA,cACA");
	});

	it("should prepend items correctly", () => {
		var source = new ReplaceSource(new OriginalSource("Line 1", "file.txt"));
		source.insert(-1, "Line -1\n");
		source.insert(-1, "Line 0\n");
		var resultText = source.source();
		var resultMap = source.sourceAndMap({
			columns: true
		});
		var resultListMap = source.sourceAndMap({
			columns: false
		});

		expect(resultText).toBe("Line -1\nLine 0\nLine 1");
		expect(resultMap.source).toEqual(resultText);
		expect(resultListMap.source).toEqual(resultText);
		expect(resultListMap.map.file).toEqual(resultMap.map.file);
		expect(resultListMap.map.version).toEqual(resultMap.map.version);
		expect(resultListMap.map.sources).toEqual(resultMap.map.sources);
		expect(resultListMap.map.sourcesContent).toEqual(
			resultMap.map.sourcesContent
		);
		expect(resultMap.map.mappings).toBe("AAAA;AAAA;AAAA");
		expect(resultListMap.map.mappings).toBe("AAAA;AAAA;AAAA");
	});

	it("should prepend items with replace at start correctly", () => {
		var source = new ReplaceSource(
			new OriginalSource(["Line 1", "Line 2"].join("\n"), "file.txt")
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

		expect(resultText).toBe("Line 0\nHello\nLine 2");
		expect(resultMap.source).toEqual(resultText);
		expect(resultListMap.source).toEqual(resultText);
		expect(resultListMap.map.file).toEqual(resultMap.map.file);
		expect(resultListMap.map.version).toEqual(resultMap.map.version);
		expect(resultListMap.map.sources).toEqual(resultMap.map.sources);
		expect(resultListMap.map.sourcesContent).toEqual(
			resultMap.map.sourcesContent
		);
		expect(resultMap.map.mappings).toBe("AAAA;AAAA,KAAM;AACN");
		expect(resultListMap.map.mappings).toBe("AAAA;AAAA;AACA");
	});

	it("should append items correctly", () => {
		var line1;
		var source = new ReplaceSource(
			new OriginalSource((line1 = "Line 1\n"), "file.txt")
		);
		source.insert(line1.length + 1, "Line 2\n");
		var resultText = source.source();
		var resultMap = source.sourceAndMap({
			columns: true
		});
		var resultListMap = source.sourceAndMap({
			columns: false
		});

		expect(resultText).toBe("Line 1\nLine 2\n");
		expect(resultMap.source).toEqual(resultText);
		expect(resultListMap.source).toEqual(resultText);
		expect(resultListMap.map.file).toEqual(resultMap.map.file);
		expect(resultListMap.map.version).toEqual(resultMap.map.version);
		expect(resultListMap.map.sources).toEqual(resultMap.map.sources);
		expect(resultListMap.map.sourcesContent).toEqual(
			resultMap.map.sourcesContent
		);
		expect(resultMap.map.mappings).toBe("AAAA");
		expect(resultListMap.map.mappings).toBe("AAAA;;");
	});

	it("should produce correct source map", () => {
		var bootstrapCode = "   var hello\n   var world\n";

		expect(function () {
			var source = new ReplaceSource(
				new OriginalSource(bootstrapCode, "file.js")
			);
			source.replace(7, 11, "h", "incorrect");
			source.replace(20, 24, "w", "identifiers");
			var resultMap = source.sourceAndMap();
			validate(resultMap.source, JSON.stringify(resultMap.map));
		}).toThrowError();

		var source = new ReplaceSource(
			new OriginalSource(bootstrapCode, "file.js")
		);
		source.replace(7, 11, "h", "hello");
		source.replace(20, 24, "w", "world");
		var resultMap = source.sourceAndMap();
		validate(resultMap.source, JSON.stringify(resultMap.map));
	});
});
