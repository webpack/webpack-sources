"use strict";

/** @typedef {import("../lib/Source").RawSourceMap} RawSourceMap */

jest.mock("./__mocks__/createMappingsSerializer");

const {
	enableDualStringBufferCaching,
	enterStringInterningRange,
	exitStringInterningRange,
	disableDualStringBufferCaching
} = require("../lib/helpers/stringBufferUtils");
const OriginalSource = require("../").OriginalSource;

describe.each([
	{
		enableMemoryOptimizations: false
	},
	{
		enableMemoryOptimizations: true
	}
])("OriginalSource %s", ({ enableMemoryOptimizations }) => {
	beforeEach(() => {
		if (enableMemoryOptimizations) {
			disableDualStringBufferCaching();
			enterStringInterningRange();
		}
	});

	afterEach(() => {
		if (enableMemoryOptimizations) {
			enableDualStringBufferCaching();
			exitStringInterningRange();
		}
	});

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
		const listMap = /** @type {RawSourceMap} */ (resultListMap.map);
		const map = /** @type {RawSourceMap} */ (resultMap.map);
		expect(listMap.file).toEqual(map.file);
		expect(listMap.version).toEqual(map.version);
		expect(map.sources).toEqual(["file.js"]);
		expect(listMap.sources).toEqual(map.sources);
		expect(map.sourcesContent).toEqual(["Line1\n\nLine3\n"]);
		expect(listMap.sourcesContent).toEqual(map.sourcesContent);
		expect(map.mappings).toBe("AAAA;;AAEA");
		expect(listMap.mappings).toBe("AAAA;AACA;AACA");
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
		expect(resultListMap.map).toBe(null);
		expect(resultMap.map).toBe(null);
	});

	it("should omit mappings for columns with node", () => {
		const source = new OriginalSource("Line1\n\nLine3\n", "file.js");
		const resultMap =
			/** @type {RawSourceMap} */
			(
				source.map({
					columns: false
				})
			);

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

	it("should split code into statements", () => {
		const input = [
			"if (hello()) { world(); hi(); there(); } done();",
			"if (hello()) { world(); hi(); there(); } done();"
		].join("\n");
		const expected = "AAAA,eAAe,SAAS,MAAM,WAAW;AACzC,eAAe,SAAS,MAAM,WAAW";
		const expected2 = "AAAA;AACA";
		const source = new OriginalSource(input, "file.js");
		expect(source.sourceAndMap().source).toBe(input);
		expect(source.sourceAndMap({ columns: false }).source).toBe(input);
		expect(/** @type {RawSourceMap} */ (source.map()).mappings).toBe(expected);
		expect(
			/** @type {RawSourceMap} */
			(source.sourceAndMap().map).mappings
		).toBe(expected);
		expect(
			/** @type {RawSourceMap} */
			(source.map({ columns: false })).mappings
		).toBe(expected2);
		expect(
			/** @type {RawSourceMap} */
			(source.sourceAndMap({ columns: false }).map).mappings
		).toBe(expected2);
	});
});
