"use strict";

const assert = require("assert");
const crypto = require("crypto");
const { afterEach, beforeEach, describe, it } = require("node:test");
const BatchedHash = require("webpack/lib/util/hash/BatchedHash");
const createMd4 = require("webpack/lib/util/hash/md4");
const createXXHash64 = require("webpack/lib/util/hash/xxhash64");
const { RawSource } = require("../");
const {
	disableDualStringBufferCaching,
	enableDualStringBufferCaching,
	enterStringInterningRange,
	exitStringInterningRange,
} = require("../lib/helpers/stringBufferUtils");

const CODE_STRING =
	"console.log('test');\nconsole.log('test2');\nconsole.log('test22');\n";

describe("rawSource", () => {
	it("converts to buffer correctly", () => {
		const source = new RawSource(Buffer.from(CODE_STRING), true);
		assert.strictEqual(source.isBuffer(), false);
		assert.deepStrictEqual(source.buffer().toString("utf8"), CODE_STRING);
		// The buffer conversion should be cached.
		assert.deepStrictEqual(source.buffer(), source.buffer());
	});

	it("converts to string on source() when constructed from buffer with convertToString=true", () => {
		const source = new RawSource(Buffer.from(CODE_STRING), true);
		assert.strictEqual(source.source(), CODE_STRING);
		// Called again to hit cache path
		assert.strictEqual(source.source(), CODE_STRING);
	});

	it("should throw TypeError for non-string non-Buffer value", () => {
		assert.throws(() => {
			// @ts-expect-error for tests
			// eslint-disable-next-line no-new
			new RawSource(42);
		}, TypeError);
		assert.throws(() => {
			// @ts-expect-error for tests
			// eslint-disable-next-line no-new
			new RawSource(null);
		}, TypeError);
		assert.throws(() => {
			// @ts-expect-error for tests
			// eslint-disable-next-line no-new
			new RawSource({});
		}, TypeError);
	});

	it("should report isBuffer() correctly for Buffer", () => {
		const source = new RawSource(Buffer.from(CODE_STRING));
		assert.strictEqual(source.isBuffer(), true);
	});

	it("should return null from map()", () => {
		const source = new RawSource(CODE_STRING);
		assert.strictEqual(source.map(), null);
		assert.strictEqual(source.map({ columns: false }), null);
	});

	it("stream chunks works correctly", () => {
		const source = new RawSource(CODE_STRING, true);
		let chunks = 0;
		// @ts-expect-error for tests
		source.streamChunks(null, (line, lineNum) => {
			chunks++;
			assert.strictEqual(
				line,
				`console.log('test${"2".repeat(lineNum - 1)}');\n`,
			);
		});
		assert.strictEqual(chunks, 3);
	});

	it("does not cache a buffer when hashing a string-backed source", () => {
		const source = new RawSource(CODE_STRING);
		const internal = /** @type {{ _valueAsBuffer?: Buffer }} */ (
			/** @type {unknown} */ (source)
		);

		source.updateHash(crypto.createHash("md5"));

		assert.strictEqual(internal._valueAsBuffer, undefined);
	});

	for (const text of [
		"Text",
		"\u00FC\u00EF \u2603 \uD83D\uDE80",
		CODE_STRING,
	]) {
		it(`hashes a string without materializing its buffer (${JSON.stringify(
			text,
		)})`, () => {
			const source = new RawSource(text);
			const expected = crypto
				.createHash("md5")
				.update("RawSource")
				.update(Buffer.from(text, "utf8"))
				.digest("hex");

			const hash = crypto.createHash("md5");
			source.updateHash(hash);

			assert.strictEqual(hash.digest("hex"), expected);
			// hashing must not leave the source holding a second copy
			assert.strictEqual(source.isBuffer(), false);
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
			const sourceString = new RawSource("Text");
			const sourceBuffer = new RawSource(Buffer.from("Text"));

			assert.strictEqual(sourceString.source(), "Text");
			assert.deepStrictEqual(sourceString.buffer(), sourceBuffer.buffer());

			sourceString.updateHash(hash[1][0]);
			sourceBuffer.updateHash(hash[1][1]);

			assert.strictEqual(hash[1][0].digest("hex"), hash[1][1].digest("hex"));
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
		it(`should have the same hash (${hash[0]}) for string and Buffer (convert to string)`, () => {
			const sourceString = new RawSource("Text", true);
			const sourceBuffer = new RawSource(Buffer.from("Text"), true);

			assert.strictEqual(sourceString.source(), "Text");
			assert.deepStrictEqual(sourceString.buffer(), sourceBuffer.buffer());

			sourceString.updateHash(hash[1][0]);
			sourceBuffer.updateHash(hash[1][1]);

			assert.strictEqual(hash[1][0].digest("hex"), hash[1][1].digest("hex"));
		});
	}

	describe("memory optimizations are enabled", () => {
		beforeEach(() => {
			disableDualStringBufferCaching();
			enterStringInterningRange();
		});

		afterEach(() => {
			enableDualStringBufferCaching();
			exitStringInterningRange();
		});

		it("should create new buffers when caching is not enabled", () => {
			const source = new RawSource(CODE_STRING, true);
			assert.deepStrictEqual(source.buffer().toString("utf8"), CODE_STRING);
			// The buffer conversion should not be cached.
			assert.deepStrictEqual(source.buffer(), source.buffer());
		});

		it("should not create new buffers when original value is a buffer", () => {
			const originalValue = Buffer.from(CODE_STRING);
			const source = new RawSource(originalValue, true);
			assert.deepStrictEqual(source.buffer().toString("utf8"), CODE_STRING);
			// The same buffer as the original value should always be returned.
			assert.deepStrictEqual(originalValue, source.buffer());
			assert.deepStrictEqual(source.buffer(), source.buffer());
		});

		it("stream chunks works correctly", () => {
			const source = new RawSource(CODE_STRING, true);
			let chunks = 0;
			// @ts-expect-error for tests
			source.streamChunks(null, (line, lineNum) => {
				chunks++;
				assert.strictEqual(
					line,
					`console.log('test${"2".repeat(lineNum - 1)}');\n`,
				);
			});
			assert.strictEqual(chunks, 3);
		});

		it("should handle streamChunks when constructed from a Buffer without pre-caching", () => {
			// Buffer backing, convertToString=false. _valueAsString remains undefined.
			const source = new RawSource(Buffer.from(CODE_STRING));
			/** @type {(string | undefined)[]} */
			const chunks = [];
			// @ts-expect-error for tests
			source.streamChunks(null, (chunk) => {
				chunks.push(chunk);
			});
			assert.strictEqual(chunks.length, 3);
		});

		it("should expose source() on a Buffer-backed RawSource", () => {
			const source = new RawSource(Buffer.from(CODE_STRING));
			assert.deepStrictEqual(source.source().toString("utf8"), CODE_STRING);
		});
	});

	it("should expose buffers() returning a single-entry Buffer[]", () => {
		const source = new RawSource(CODE_STRING);
		const buffers = source.buffers();
		assert.strictEqual(Array.isArray(buffers), true);
		assert.strictEqual(buffers.length, 1);
		assert.deepStrictEqual(buffers[0], Buffer.from(CODE_STRING));
		assert.deepStrictEqual(Buffer.concat(buffers), source.buffer());
	});

	it("should reuse the underlying buffer in buffers() when constructed from a Buffer", () => {
		const buffer = Buffer.from(CODE_STRING);
		const source = new RawSource(buffer);
		const buffers = source.buffers();
		assert.strictEqual(buffers.length, 1);
		assert.strictEqual(buffers[0], buffer);
	});
});
