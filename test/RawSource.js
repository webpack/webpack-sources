"use strict";

const crypto = require("crypto");
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
		expect(source.isBuffer()).toBe(false);
		expect(source.buffer().toString("utf8")).toEqual(CODE_STRING);
		// The buffer conversion should be cached.
		expect(source.buffer()).toStrictEqual(source.buffer());
	});

	it("converts to string on source() when constructed from buffer with convertToString=true", () => {
		const source = new RawSource(Buffer.from(CODE_STRING), true);
		expect(source.source()).toBe(CODE_STRING);
		// Called again to hit cache path
		expect(source.source()).toBe(CODE_STRING);
	});

	it("should throw TypeError for non-string non-Buffer value", () => {
		expect(() => {
			// @ts-expect-error for tests
			// eslint-disable-next-line no-new
			new RawSource(42);
		}).toThrow(TypeError);
		expect(() => {
			// @ts-expect-error for tests
			// eslint-disable-next-line no-new
			new RawSource(null);
		}).toThrow(TypeError);
		expect(() => {
			// @ts-expect-error for tests
			// eslint-disable-next-line no-new
			new RawSource({});
		}).toThrow(TypeError);
	});

	it("should report isBuffer() correctly for Buffer", () => {
		const source = new RawSource(Buffer.from(CODE_STRING));
		expect(source.isBuffer()).toBe(true);
	});

	it("should return null from map()", () => {
		const source = new RawSource(CODE_STRING);
		expect(source.map()).toBeNull();
		expect(source.map({ columns: false })).toBeNull();
	});

	it("stream chunks works correctly", () => {
		const source = new RawSource(CODE_STRING, true);
		// @ts-expect-error for tests
		source.streamChunks(null, (line, lineNum) => {
			expect(line).toBe(`console.log('test${"2".repeat(lineNum - 1)}');\n`);
		});
		expect.assertions(3);
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
			const sourceString = new RawSource("Text");
			const sourceBuffer = new RawSource(Buffer.from("Text"));

			expect(sourceString.source()).toBe("Text");
			expect(sourceString.buffer()).toEqual(sourceBuffer.buffer());

			sourceString.updateHash(hash[1][0]);
			sourceBuffer.updateHash(hash[1][1]);

			expect(hash[1][0].digest("hex")).toBe(hash[1][1].digest("hex"));
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

			expect(sourceString.source()).toBe("Text");
			expect(sourceString.buffer()).toEqual(sourceBuffer.buffer());

			sourceString.updateHash(hash[1][0]);
			sourceBuffer.updateHash(hash[1][1]);

			expect(hash[1][0].digest("hex")).toBe(hash[1][1].digest("hex"));
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
			expect(source.buffer().toString("utf8")).toEqual(CODE_STRING);
			// The buffer conversion should not be cached.
			expect(source.buffer()).toStrictEqual(source.buffer());
		});

		it("should not create new buffers when original value is a buffer", () => {
			const originalValue = Buffer.from(CODE_STRING);
			const source = new RawSource(originalValue, true);
			expect(source.buffer().toString("utf8")).toEqual(CODE_STRING);
			// The same buffer as the original value should always be returned.
			expect(originalValue).toStrictEqual(source.buffer());
			expect(source.buffer()).toStrictEqual(source.buffer());
		});

		it("stream chunks works correctly", () => {
			const source = new RawSource(CODE_STRING, true);
			// @ts-expect-error for tests
			source.streamChunks(null, (line, lineNum) => {
				expect(line).toBe(`console.log('test${"2".repeat(lineNum - 1)}');\n`);
			});
			expect.assertions(3);
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
			expect(chunks).toHaveLength(3);
		});

		it("should expose source() on a Buffer-backed RawSource", () => {
			const source = new RawSource(Buffer.from(CODE_STRING));
			expect(source.source().toString("utf8")).toEqual(CODE_STRING);
		});
	});

	it("should expose buffers() returning a single-entry Buffer[]", () => {
		const source = new RawSource(CODE_STRING);
		const buffers = source.buffers();
		expect(Array.isArray(buffers)).toBe(true);
		expect(buffers).toHaveLength(1);
		expect(buffers[0]).toEqual(Buffer.from(CODE_STRING));
		expect(Buffer.concat(buffers)).toEqual(source.buffer());
	});

	it("should reuse the underlying buffer in buffers() when constructed from a Buffer", () => {
		const buffer = Buffer.from(CODE_STRING);
		const source = new RawSource(buffer);
		const buffers = source.buffers();
		expect(buffers).toHaveLength(1);
		expect(buffers[0]).toBe(buffer);
	});
});
