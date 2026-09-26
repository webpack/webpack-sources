"use strict";

const assert = require("assert");
const crypto = require("crypto");
const { afterEach, beforeEach, describe, it } = require("node:test");
const BatchedHash = require("webpack/lib/util/hash/BatchedHash");
const createMd4 = require("webpack/lib/util/hash/md4");
const createXXHash64 = require("webpack/lib/util/hash/xxhash64");

/** @typedef {import("../lib/Source").RawSourceMap} RawSourceMap */

const { OriginalSource } = require("../");
const {
	disableDualStringBufferCaching,
	enableDualStringBufferCaching,
	enterStringInterningRange,
	exitStringInterningRange,
} = require("../lib/helpers/stringBufferUtils");

for (const enableMemoryOptimizations of [false, true]) {
	describe(`originalSource (enableMemoryOptimizations: ${enableMemoryOptimizations})`, () => {
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

			assert.strictEqual(resultText, "Line1\n\nLine3\n");
			assert.deepStrictEqual(result.source, resultText);
			assert.deepStrictEqual(resultList.source, resultText);
			const listMap = /** @type {RawSourceMap} */ (resultList.map);
			const resultMap = /** @type {RawSourceMap} */ (result.map);
			assert.deepStrictEqual(listMap.file, resultMap.file);
			assert.deepStrictEqual(listMap.version, resultMap.version);
			assert.deepStrictEqual(resultMap.sources, ["file.js"]);
			assert.deepStrictEqual(listMap.sources, resultMap.sources);
			assert.deepStrictEqual(resultMap.sourcesContent, ["Line1\n\nLine3\n"]);
			assert.deepStrictEqual(listMap.sourcesContent, resultMap.sourcesContent);
			assert.strictEqual(resultMap.mappings, "AAAA;;AAEA");
			assert.strictEqual(listMap.mappings, "AAAA;AACA;AACA");
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

			assert.strictEqual(resultText, "");
			assert.deepStrictEqual(resultMap.source, resultText);
			assert.deepStrictEqual(resultListMap.source, resultText);
			assert.strictEqual(resultListMap.map, null);
			assert.strictEqual(resultMap.map, null);
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

			assert.strictEqual(resultMap.mappings, "AAAA;AACA;AACA");
		});

		it("should return the correct size for binary files", () => {
			const source = new OriginalSource(
				Buffer.from(Array.from({ length: 256 })),
				"file.wasm",
			);
			assert.strictEqual(source.size(), 256);
		});

		it("should expose getName()", () => {
			const source = new OriginalSource("hi", "file.js");
			assert.strictEqual(source.getName(), "file.js");
		});

		it("should expose buffers() returning a single-entry Buffer[]", () => {
			const content = "Line1\nLine2\n";
			const source = new OriginalSource(content, "file.js");
			const buffers = source.buffers();
			assert.strictEqual(Array.isArray(buffers), true);
			assert.strictEqual(buffers.length, 1);
			assert.deepStrictEqual(buffers[0], Buffer.from(content));
		});

		it("should reuse the underlying buffer in buffers() when constructed from a Buffer", () => {
			const buffer = Buffer.from("Line1\nLine2\n");
			const source = new OriginalSource(buffer, "file.js");
			const buffers = source.buffers();
			assert.strictEqual(buffers.length, 1);
			assert.strictEqual(buffers[0], buffer);
		});

		it("should compute map correctly from buffer-backed source", () => {
			const content = "Line1\nLine2\n";
			const source = new OriginalSource(Buffer.from(content), "file.js");
			assert.strictEqual(source.sourceAndMap().source, content);
		});

		it("should map correctly when constructed from a Buffer (streamChunks path)", () => {
			const content = "Line1\nLine2\n";
			const source = new OriginalSource(Buffer.from(content), "file.js");
			// Calling map() without calling source() first to ensure streamChunks
			// populates _value from the buffer
			assert.notStrictEqual(source.map({ columns: false }), null);
		});

		it("should return the correct size for unicode files", () => {
			const source = new OriginalSource("😋", "file.js");
			assert.strictEqual(source.size(), 4);
		});

		it("should split code into statements", () => {
			const input = [
				"if (hello()) { world(); hi(); there(); } done();",
				"if (hello()) { world(); hi(); there(); } done();",
			].join("\n");
			const expected = "AAAA,eAAe,SAAS,MAAM,WAAW;AACzC,eAAe,SAAS,MAAM,WAAW";
			const expected2 = "AAAA;AACA";
			const source = new OriginalSource(input, "file.js");
			assert.strictEqual(source.sourceAndMap().source, input);
			assert.strictEqual(source.sourceAndMap({ columns: false }).source, input);
			assert.strictEqual(
				/** @type {RawSourceMap} */ (source.map()).mappings,
				expected,
			);
			assert.strictEqual(
				/** @type {RawSourceMap} */
				(source.sourceAndMap().map).mappings,
				expected,
			);
			assert.strictEqual(
				/** @type {RawSourceMap} */
				(source.map({ columns: false })).mappings,
				expected2,
			);
			assert.strictEqual(
				/** @type {RawSourceMap} */
				(source.sourceAndMap({ columns: false }).map).mappings,
				expected2,
			);
		});

		it("does not cache a buffer when hashing a string-backed source", () => {
			const source = new OriginalSource("Text", "file.js");
			const internal = /** @type {{ _valueAsBuffer?: Buffer }} */ (
				/** @type {unknown} */ (source)
			);

			source.updateHash(crypto.createHash("md5"));

			assert.strictEqual(internal._valueAsBuffer, undefined);
		});

		for (const text of ["Text", "\u00FC\u00EF \u2603 \uD83D\uDE80"]) {
			it(`hashes a string without materializing its buffer (${JSON.stringify(
				text,
			)})`, () => {
				const source = new OriginalSource(text, "file.js");
				const expected = crypto
					.createHash("md5")
					.update("OriginalSource")
					.update(Buffer.from(text, "utf8"))
					.update("file.js")
					.digest("hex");

				const hash = crypto.createHash("md5");
				source.updateHash(hash);

				assert.strictEqual(hash.digest("hex"), expected);
				assert.strictEqual(source.source(), text);
			});
		}

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

				assert.strictEqual(sourceString.source(), "Text");
				assert.strictEqual(sourceString.source(), sourceBuffer.source());

				sourceString.updateHash(hash[1][0]);
				sourceBuffer.updateHash(hash[1][1]);

				assert.strictEqual(hash[1][0].digest("hex"), hash[1][1].digest("hex"));
			});
		}
	});
}
