const OriginalSource = require("../").OriginalSource;

describe("OriginalSource", () => {
	it("should handle multiline string", () => {
		const source = new OriginalSource("Line1\n\nLine3\n", "file.js");
		const resultText = source.source();
		const resultMap = source.sourceAndMap({
			columns: true
		});
		const resultListMap = source.sourceAndMap({
			columns: false
		});

		expect(resultText).toBe("Line1\n\nLine3\n");
		expect(resultMap.source).toEqual(resultText);
		expect(resultListMap.source).toEqual(resultText);
		expect(resultListMap.map.file).toEqual(resultMap.map.file);
		expect(resultListMap.map.version).toEqual(resultMap.map.version);
		expect(resultMap.map.sources).toEqual(["file.js"]);
		expect(resultListMap.map.sources).toEqual(resultMap.map.sources);
		expect(resultMap.map.sourcesContent).toEqual(["Line1\n\nLine3\n"]);
		expect(resultListMap.map.sourcesContent).toEqual(
			resultMap.map.sourcesContent
		);
		expect(resultMap.map.mappings).toBe("AAAA;;AAEA");
		expect(resultListMap.map.mappings).toBe("AAAA;AACA;AACA;");
	});

	it("should handle empty string", () => {
		const source = new OriginalSource("", "file.js");
		const resultText = source.source();
		const resultMap = source.sourceAndMap({
			columns: true
		});
		const resultListMap = source.sourceAndMap({
			columns: false
		});

		expect(resultText).toBe("");
		expect(resultMap.source).toEqual(resultText);
		expect(resultListMap.source).toEqual(resultText);
		expect(resultListMap.map.file).toEqual(resultMap.map.file);
		expect(resultListMap.map.version).toEqual(resultMap.map.version);
		expect(resultMap.map.sources).toEqual([]);
		expect(resultListMap.map.sources).toEqual(resultMap.map.sources);
		expect(resultMap.map.mappings).toBe("");
		expect(resultListMap.map.mappings).toBe("");
	});

	it("should omit mappings for columns with node", () => {
		const source = new OriginalSource("Line1\n\nLine3\n", "file.js");
		const resultMap = source
			.node({
				columns: false
			})
			.toStringWithSourceMap({
				file: "x"
			})
			.map.toJSON();

		expect(resultMap.mappings).toBe("AAAA;AACA;AACA");
	});

	it("should return the correct size for binary files", () => {
		const source = new OriginalSource(Buffer.from(new Array(256)), "file.wasm");
		expect(source.size()).toBe(256);
	});

	it("should return the correct size for unicode files", () => {
		const source = new OriginalSource("😋", "file.js");
		expect(source.size()).toBe(4);
	});
});
