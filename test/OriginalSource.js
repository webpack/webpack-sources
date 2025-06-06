"use strict";

const crypto = require("node:crypto");
const BatchedHash = require("webpack/lib/util/hash/BatchedHash");
const createMd4 = require("webpack/lib/util/hash/md4");
const createXXHash64 = require("webpack/lib/util/hash/xxhash64");

/** @typedef {import("../lib/Source").RawSourceMap} RawSourceMap */

jest.mock("./__mocks__/createMappingsSerializer");

const {
	enableDualStringBufferCaching,
	enterStringInterningRange,
	exitStringInterningRange,
	disableDualStringBufferCaching,
} = require("../lib/helpers/stringBufferUtils");
const { OriginalSource } = require("../");

describe.each([
	{
		enableMemoryOptimizations: false,
	},
	{
		enableMemoryOptimizations: true,
	},
])("originalSource %s", ({ enableMemoryOptimizations }) => {
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
		const result = source.sourceAndMap({
			columns: true,
		});
		const resultList = source.sourceAndMap({
			columns: false,
		});

		expect(resultText).toBe("Line1\n\nLine3\n");
		expect(result.source).toEqual(resultText);
		expect(resultList.source).toEqual(resultText);
		const listMap = /** @type {RawSourceMap} */ (resultList.map);
		const resultMap = /** @type {RawSourceMap} */ (result.map);
		expect(listMap.file).toEqual(resultMap.file);
		expect(listMap.version).toEqual(resultMap.version);
		expect(resultMap.sources).toEqual(["file.js"]);
		expect(listMap.sources).toEqual(resultMap.sources);
		expect(resultMap.sourcesContent).toEqual(["Line1\n\nLine3\n"]);
		expect(listMap.sourcesContent).toEqual(resultMap.sourcesContent);
		expect(resultMap.mappings).toBe("AAAA;;AAEA");
		expect(listMap.mappings).toBe("AAAA;AACA;AACA");
	});

	it("should handle empty string", () => {
		const source = new OriginalSource("", "file.js");
		const resultText = source.source();
		const resultMap = source.sourceAndMap({
			columns: true,
		});
		const resultListMap = source.sourceAndMap({
			columns: false,
		});

		expect(resultText).toBe("");
		expect(resultMap.source).toEqual(resultText);
		expect(resultListMap.source).toEqual(resultText);
		expect(resultListMap.map).toBeNull();
		expect(resultMap.map).toBeNull();
	});

	it("should omit mappings for columns with node", () => {
		const source = new OriginalSource("Line1\n\nLine3\n", "file.js");
		const resultMap =
			/** @type {RawSourceMap} */
			(
				source.map({
					columns: false,
				})
			);

		expect(resultMap.mappings).toBe("AAAA;AACA;AACA");
	});

	it("should return the correct size for binary files", () => {
		const source = new OriginalSource(
			Buffer.from(Array.from({ length: 256 })),
			"file.wasm",
		);
		expect(source.size()).toBe(256);
	});

	it("should return the correct size for unicode files", () => {
		const source = new OriginalSource("😋", "file.js");
		expect(source.size()).toBe(4);
	});

	it("should split code into statements", () => {
		const input = [
			"if (hello()) { world(); hi(); there(); } done();",
			"if (hello()) { world(); hi(); there(); } done();",
		].join("\n");
		const expected = "AAAA,eAAe,SAAS,MAAM,WAAW;AACzC,eAAe,SAAS,MAAM,WAAW";
		const expected2 = "AAAA;AACA";
		const source = new OriginalSource(input, "file.js");
		expect(source.sourceAndMap().source).toBe(input);
		expect(source.sourceAndMap({ columns: false }).source).toBe(input);
		expect(/** @type {RawSourceMap} */ (source.map()).mappings).toBe(expected);
		expect(
			/** @type {RawSourceMap} */
			(source.sourceAndMap().map).mappings,
		).toBe(expected);
		expect(
			/** @type {RawSourceMap} */
			(source.map({ columns: false })).mappings,
		).toBe(expected2);
		expect(
			/** @type {RawSourceMap} */
			(source.sourceAndMap({ columns: false }).map).mappings,
		).toBe(expected2);
	});

	for (const hash of [
		["md5", [crypto.createHash("md5"), crypto.createHash("md5")]],
		["md4", [new BatchedHash(createMd4()), new BatchedHash(createMd4())]],
		[
			"xxhash64",
			[new BatchedHash(createXXHash64()), new BatchedHash(createXXHash64())],
		],
	]) {
		it(`should have the same hash (${hash[0]}) for string and Buffer`, () => {
			const sourceString = new OriginalSource("Text", "file.js");
			const sourceBuffer = new OriginalSource(Buffer.from("Text"), "file.js");

			expect(sourceString.source()).toBe("Text");
			expect(sourceString.source()).toBe(sourceBuffer.source());

			sourceString.updateHash(hash[1][0]);
			sourceBuffer.updateHash(hash[1][1]);

			expect(hash[1][0].digest("hex")).toBe(hash[1][1].digest("hex"));
		});
	}
});
