"use strict";

const assert = require("assert");
const crypto = require("crypto");
const { afterEach, beforeEach, describe, it } = require("node:test");
const { CachedSource } = require("../");
const { ConcatSource } = require("../");
const { OriginalSource } = require("../");
const { RawSource } = require("../");
const { Source } = require("../");
const streamChunks = require("../lib/helpers/streamChunks");
const {
	disableDualStringBufferCaching,
	enableDualStringBufferCaching,
	enterStringInterningRange,
	exitStringInterningRange,
} = require("../lib/helpers/stringBufferUtils");

class TrackedSource extends Source {
	constructor(source) {
		super();
		this._innerSource = source;
		this.sizeCalled = 0;
		this.sourceCalled = 0;
		this.bufferCalled = 0;
		this.mapCalled = 0;
		this.sourceAndMapCalled = 0;
		this.updateHashCalled = 0;
	}

	getCalls() {
		return {
			size: this.sizeCalled,
			source: this.sourceCalled,
			buffer: this.bufferCalled,
			map: this.mapCalled,
			sourceAndMap: this.sourceAndMapCalled,
			hash: this.updateHashCalled,
		};
	}

	size() {
		this.sizeCalled++;
		return this._innerSource.size();
	}

	source() {
		this.sourceCalled++;
		return this._innerSource.source();
	}

	buffer() {
		this.bufferCalled++;
		return this._innerSource.buffer();
	}

	map(options) {
		this.mapCalled++;
		return this._innerSource.map(options);
	}

	sourceAndMap(options) {
		this.sourceAndMapCalled++;
		return this._innerSource.sourceAndMap(options);
	}

	updateHash(hash) {
		this.updateHashCalled++;
		return this._innerSource.updateHash(hash);
	}
}

const getHash = (source) => {
	const hash = crypto.createHash("md5");
	source.updateHash(hash);
	return hash.digest("hex");
};

for (const enableMemoryOptimizations of [false, true]) {
	describe(`cachedSource (enableMemoryOptimizations: ${enableMemoryOptimizations})`, () => {
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

		it("should return the correct size for binary files", () => {
			const source = new OriginalSource(
				Buffer.from(Array.from({ length: 256 })),
				"file.wasm",
			);
			const cachedSource = new CachedSource(source);

			assert.strictEqual(cachedSource.size(), 256);
			assert.strictEqual(cachedSource.size(), 256);
		});

		it("should return the correct size for cached binary sources", () => {
			const source = new OriginalSource(
				Buffer.from(Array.from({ length: 256 })),
				"file.wasm",
			);
			const cachedSource = new CachedSource(source);

			cachedSource.source();
			assert.strictEqual(cachedSource.size(), 256);
			assert.strictEqual(cachedSource.size(), 256);
		});

		it("should return the correct size for text files", () => {
			const source = new OriginalSource("TestTestTest", "file.js");
			const cachedSource = new CachedSource(source);

			assert.strictEqual(cachedSource.size(), 12);
			assert.strictEqual(cachedSource.size(), 12);
		});

		it("should return the correct size for cached text files", () => {
			const source = new OriginalSource("TestTestTest", "file.js");
			const cachedSource = new CachedSource(source);

			cachedSource.source();
			assert.strictEqual(cachedSource.size(), 12);
			assert.strictEqual(cachedSource.size(), 12);
		});

		it("should return the correct size for unicode files", () => {
			const source = new OriginalSource("😋", "file.js");
			const cachedSource = new CachedSource(source);

			assert.strictEqual(cachedSource.size(), 4);
			assert.strictEqual(cachedSource.size(), 4);
		});

		it("should return the correct size for cached unicode files", () => {
			const source = new OriginalSource("😋", "file.js");
			const cachedSource = new CachedSource(source);

			cachedSource.source();
			assert.strictEqual(cachedSource.size(), 4);
			assert.strictEqual(cachedSource.size(), 4);
		});

		it("should use the source cache for all other calls", () => {
			const original = new OriginalSource("TestTestTest", "file.js");
			const source = new TrackedSource(original);
			const cachedSource = new CachedSource(source);

			assert.strictEqual(cachedSource.source(), "TestTestTest");
			assert.strictEqual(cachedSource.size(), 12);
			assert.strictEqual(
				cachedSource.buffer().toString("utf8"),
				"TestTestTest",
			);
			assert.strictEqual(getHash(cachedSource), getHash(original));
			assert.deepStrictEqual(source.getCalls(), {
				size: 0,
				source: 1,
				buffer: 0,
				map: 0,
				sourceAndMap: 0,
				hash: 1,
			});
		});

		it("should use the source cache for all other calls #2", () => {
			const original = new OriginalSource("TestTestTest", "file.js");
			const source = new TrackedSource(original);
			const cachedSource = new CachedSource(source);

			assert.strictEqual(cachedSource.source(), "TestTestTest");
			assert.strictEqual(cachedSource.source(), "TestTestTest");
			assert.strictEqual(cachedSource.size(), 12);
			assert.strictEqual(cachedSource.size(), 12);
			assert.strictEqual(
				cachedSource.buffer().toString("utf8"),
				"TestTestTest",
			);
			assert.strictEqual(
				cachedSource.buffer().toString("utf8"),
				"TestTestTest",
			);
			assert.strictEqual(cachedSource.sourceAndMap().source, "TestTestTest");
			assert.strictEqual(typeof cachedSource.sourceAndMap().map, "object");
			assert.strictEqual(typeof cachedSource.map(), "object");
			assert.strictEqual(typeof cachedSource.map(), "object");
			assert.strictEqual(getHash(cachedSource), getHash(original));
			assert.deepStrictEqual(source.getCalls(), {
				size: 0,
				source: 1,
				buffer: 0,
				map: 1,
				sourceAndMap: 0,
				hash: 1,
			});
		});

		it("should not use buffer for source", () => {
			const source = new TrackedSource(
				new OriginalSource("TestTestTest", "file.js"),
			);
			const cachedSource = new CachedSource(source);

			assert.strictEqual(cachedSource.size(), 12);
			assert.strictEqual(cachedSource.size(), 12);
			assert.strictEqual(
				cachedSource.buffer().toString("utf8"),
				"TestTestTest",
			);
			assert.strictEqual(
				cachedSource.buffer().toString("utf8"),
				"TestTestTest",
			);
			assert.strictEqual(cachedSource.source(), "TestTestTest");
			assert.strictEqual(cachedSource.source(), "TestTestTest");
			assert.deepStrictEqual(source.getCalls(), {
				size: 1,
				source: 1,
				buffer: 1,
				map: 0,
				sourceAndMap: 0,
				hash: 0,
			});
		});

		it("should use map for sourceAndMap", () => {
			const source = new TrackedSource(
				new OriginalSource("TestTestTest", "file.js"),
			);
			const cachedSource = new CachedSource(source);

			assert.strictEqual(typeof cachedSource.map(), "object");
			assert.strictEqual(typeof cachedSource.map(), "object");
			assert.strictEqual(cachedSource.sourceAndMap().source, "TestTestTest");
			assert.strictEqual(typeof cachedSource.sourceAndMap().map, "object");
			assert.strictEqual(cachedSource.size(), 12);
			assert.strictEqual(cachedSource.size(), 12);
			assert.strictEqual(
				cachedSource.buffer().toString("utf8"),
				"TestTestTest",
			);
			assert.strictEqual(
				cachedSource.buffer().toString("utf8"),
				"TestTestTest",
			);
			assert.strictEqual(cachedSource.source(), "TestTestTest");
			assert.strictEqual(cachedSource.source(), "TestTestTest");
			assert.deepStrictEqual(source.getCalls(), {
				size: 0,
				source: 1,
				buffer: 0,
				map: 1,
				sourceAndMap: 0,
				hash: 0,
			});
		});

		it("should use binary source for buffer", () => {
			const buffer = Buffer.from(Array.from({ length: 256 }));
			const source = new TrackedSource(new RawSource(buffer));
			const cachedSource = new CachedSource(source);

			assert.strictEqual(cachedSource.sourceAndMap().source, buffer);
			assert.strictEqual(cachedSource.sourceAndMap().source, buffer);
			assert.strictEqual(cachedSource.sourceAndMap().map, null);
			assert.strictEqual(cachedSource.buffer(), buffer);
			assert.strictEqual(cachedSource.buffer(), buffer);
			assert.strictEqual(cachedSource.source(), buffer);
			assert.strictEqual(cachedSource.source(), buffer);
			assert.deepStrictEqual(source.getCalls(), {
				size: 0,
				source: 0,
				buffer: 0,
				map: 0,
				sourceAndMap: 1,
				hash: 0,
			});
		});

		it("should use an old webpack-sources Source with Buffer", () => {
			const buffer = Buffer.from(Array.from({ length: 256 }));
			const source = new TrackedSource(new RawSource(buffer));
			// @ts-expect-error for tests
			source.buffer = undefined;
			const cachedSource = new CachedSource(source);

			assert.strictEqual(cachedSource.buffer(), buffer);
			assert.strictEqual(cachedSource.buffer(), buffer);
			assert.strictEqual(cachedSource.source(), buffer);
			assert.strictEqual(cachedSource.source(), buffer);
			assert.deepStrictEqual(source.getCalls(), {
				size: 0,
				source: 1,
				buffer: 0,
				map: 0,
				sourceAndMap: 0,
				hash: 0,
			});
		});

		it("should use an old webpack-sources Source with String", () => {
			const string = "Hello World";
			const source = new TrackedSource(new RawSource(string));
			// @ts-expect-error for tests
			source.buffer = undefined;
			const cachedSource = new CachedSource(source);

			const buffer = cachedSource.buffer();

			assert.strictEqual(Buffer.isBuffer(buffer), true);
			assert.strictEqual(buffer.toString("utf8"), string);
			assert.strictEqual(
				enableMemoryOptimizations
					? cachedSource.buffer().equals(buffer)
					: cachedSource.buffer(),
				enableMemoryOptimizations ? true : buffer,
			);
			assert.strictEqual(cachedSource.source(), string);
			assert.strictEqual(cachedSource.source(), string);
			assert.deepStrictEqual(source.getCalls(), {
				size: 0,
				source: 1,
				buffer: 0,
				map: 0,
				sourceAndMap: 0,
				hash: 0,
			});
		});

		it("should include map in the cache if only streamChunks was computed", () => {
			const original = new OriginalSource("Hello World", "test.txt");
			const source = new TrackedSource(original);
			const cachedSource = new CachedSource(source);

			// @ts-expect-error for tests
			source.streamChunks = (...args) => streamChunks(original, ...args);

			// fill up cache
			cachedSource.streamChunks(
				{},
				() => {},
				() => {},
				() => {},
			);

			const cachedData = cachedSource.getCachedData();
			assert.strictEqual(cachedData.maps.size, 1);
		});

		it("should allow to store and restore cached data (with SourceMap)", () => {
			const original = new OriginalSource("Hello World", "test.txt");
			const source = new CachedSource(original);

			// fill up cache
			source.source();
			source.map({});
			source.size();
			getHash(source);

			// @ts-expect-error for tests
			const clone = new CachedSource(null, source.getCachedData());

			assert.deepStrictEqual(clone.source(), source.source());
			assert.deepStrictEqual(clone.buffer(), source.buffer());
			assert.deepStrictEqual(clone.size(), source.size());
			assert.deepStrictEqual(clone.map({}), source.map({}));
			assert.deepStrictEqual(clone.sourceAndMap({}), source.sourceAndMap({}));
			assert.strictEqual(getHash(clone), getHash(original));

			// @ts-expect-error for tests
			const clone2 = new CachedSource(null, clone.getCachedData());

			assert.deepStrictEqual(clone2.source(), source.source());
			assert.deepStrictEqual(clone2.buffer(), source.buffer());
			assert.deepStrictEqual(clone2.size(), source.size());
			assert.deepStrictEqual(clone2.map({}), source.map({}));
			assert.deepStrictEqual(clone2.sourceAndMap({}), source.sourceAndMap({}));
			assert.strictEqual(getHash(clone2), getHash(original));
		});

		it("should allow to store and restore cached data (without SourceMap)", () => {
			const original = new RawSource("Hello World");
			const source = new CachedSource(original);

			// fill up cache
			source.source();
			source.map({});
			source.size();
			getHash(source);

			// @ts-expect-error for tests
			const clone = new CachedSource(null, source.getCachedData());

			assert.deepStrictEqual(clone.source(), source.source());
			assert.deepStrictEqual(clone.buffer(), source.buffer());
			assert.deepStrictEqual(clone.size(), source.size());
			assert.strictEqual(clone.map({}), null);
			assert.deepStrictEqual(clone.sourceAndMap({}), source.sourceAndMap({}));
			assert.strictEqual(getHash(clone), getHash(original));
		});

		it("should allow to store and restore cached data, but fallback to the original source when needed", () => {
			const original = new RawSource("Hello World");
			const source = new CachedSource(original);

			// fill up cache
			source.source();
			source.size();

			let calls = 0;
			const clone = () =>
				new CachedSource(() => {
					calls++;
					return original;
				}, source.getCachedData());

			assert.deepStrictEqual(clone().source(), source.source());
			assert.deepStrictEqual(clone().buffer(), source.buffer());
			assert.deepStrictEqual(clone().size(), source.size());
			assert.strictEqual(calls, 0);
			const clone1 = clone();
			assert.strictEqual(clone1.map({}), null);
			assert.strictEqual(calls, 1);
			assert.strictEqual(clone1.map({}), null);
			assert.strictEqual(calls, 1);
			assert.deepStrictEqual(clone().sourceAndMap({}), source.sourceAndMap({}));
			assert.strictEqual(calls, 2);
			assert.strictEqual(getHash(clone()), getHash(original));
			assert.strictEqual(calls, 3);
		});

		it("should expose originalLazy (function form) and original()", () => {
			const original = new RawSource("Hello World");
			const lazy = () => original;
			const source = new CachedSource(lazy);
			assert.strictEqual(source.originalLazy(), lazy);
			assert.strictEqual(source.original(), original);
			// After original() resolves the function, originalLazy returns the resolved source
			assert.strictEqual(source.originalLazy(), original);
		});

		it("should compute size from cached buffer when _cachedSize is undefined", () => {
			const buffer = Buffer.from("Hello World");
			// Provide cachedData with buffer but no size
			const cachedSource = new CachedSource(new RawSource("Hello World"), {
				buffer,
				maps: new Map(),
			});
			assert.strictEqual(cachedSource.size(), buffer.length);
			assert.strictEqual(cachedSource.size(), buffer.length);
		});

		it("should return null for missing map when cached entry is empty", () => {
			const cachedSource = new CachedSource(new RawSource("Hello World"), {
				buffer: Buffer.from("Hello World"),
				size: 11,
				maps: new Map([["{}", {}]]),
			});
			assert.strictEqual(cachedSource.map(), null);
		});

		it("should flush accumulated hash strings when they exceed the threshold", () => {
			class StringyHashSource extends Source {
				source() {
					return "ignored";
				}

				buffer() {
					return Buffer.from("ignored");
				}

				size() {
					return 7;
				}

				map() {
					return null;
				}

				updateHash(hash) {
					for (let i = 0; i < 15000; i++) {
						hash.update(`chunk-${i}-`);
					}
				}
			}

			const cachedSource = new CachedSource(new StringyHashSource());

			const hashA = crypto.createHash("md5");
			cachedSource.updateHash(hashA);
			const digestA = hashA.digest("hex");

			// When hashing again, the cached hash update is replayed directly
			const hashB = crypto.createHash("md5");
			cachedSource.updateHash(hashB);
			const digestB = hashB.digest("hex");

			assert.strictEqual(digestA, digestB);
		});

		it("should handle hash updates starting with a Buffer (no prior string to flush)", () => {
			class BufferFirstHashSource extends Source {
				source() {
					return "text";
				}

				buffer() {
					return Buffer.from("text");
				}

				size() {
					return 4;
				}

				map() {
					return null;
				}

				updateHash(hash) {
					// Start with a Buffer so the tracker "else" branch runs
					// with currentString === undefined, and also pass a long string
					// so the length-gate in the "string" branch is exercised.
					hash.update(Buffer.from("leading-buffer-"));
					hash.update("a".repeat(11000));
					hash.update("short-string");
				}
			}

			const cachedSource = new CachedSource(new BufferFirstHashSource());
			const hashA = crypto.createHash("md5");
			cachedSource.updateHash(hashA);
			const digestA = hashA.digest("hex");

			const hashB = crypto.createHash("md5");
			cachedSource.updateHash(hashB);
			const digestB = hashB.digest("hex");

			assert.strictEqual(digestA, digestB);
		});

		it("should flush a pending string when a Buffer follows it", () => {
			class StringThenBufferHashSource extends Source {
				source() {
					return "text";
				}

				buffer() {
					return Buffer.from("text");
				}

				size() {
					return 4;
				}

				map() {
					return null;
				}

				updateHash(hash) {
					// A short string accumulates in the tracker; the Buffer that
					// follows must flush it before pushing itself.
					hash.update("short-string");
					hash.update(Buffer.from("trailing-buffer"));
				}
			}

			const cachedSource = new CachedSource(new StringThenBufferHashSource());
			const hashA = crypto.createHash("md5");
			cachedSource.updateHash(hashA);
			const digestA = hashA.digest("hex");

			const expected = crypto
				.createHash("md5")
				.update("short-string")
				.update(Buffer.from("trailing-buffer"))
				.digest("hex");
			assert.strictEqual(digestA, expected);

			// the cached update replays to the same digest
			const hashB = crypto.createHash("md5");
			cachedSource.updateHash(hashB);
			assert.strictEqual(hashB.digest("hex"), expected);
		});

		it("should allow streamChunks when cached map exists but source is not cached", () => {
			const original = new OriginalSource("Hello World", "file.js");
			const cachedSource = new CachedSource(original);

			// Populate map cache only (no source/buffer cached yet)
			cachedSource.map({});

			const chunks = [];
			cachedSource.streamChunks(
				{},
				(...args) => {
					chunks.push(args);
				},
				() => {},
				() => {},
			);
			assert.ok(chunks.length > 0);
		});

		it("should return Buffer[] from buffers() and delegate to the original source", () => {
			const original = new ConcatSource(
				new RawSource(Buffer.from("hello ")),
				new RawSource(Buffer.from("world")),
			);
			const cachedSource = new CachedSource(original);

			const buffers = cachedSource.buffers();
			assert.strictEqual(Array.isArray(buffers), true);
			assert.strictEqual(buffers.length, 2);
			assert.strictEqual(
				Buffer.concat(buffers).toString("utf8"),
				"hello world",
			);
			// The second call should return the cached array
			assert.strictEqual(cachedSource.buffers(), buffers);
		});

		it("should return a single-entry Buffer[] from buffers() when buffer is already cached", () => {
			const buffer = Buffer.from("cached");
			const original = new RawSource(buffer);
			const cachedSource = new CachedSource(original);
			// Populate the buffer cache
			cachedSource.buffer();
			const buffers = cachedSource.buffers();
			assert.strictEqual(buffers.length, 1);
			assert.strictEqual(buffers[0], buffer);
		});

		it("should round-trip CachedSource with a Buffer-backed source", () => {
			const buffer = Buffer.from(Array.from({ length: 64 }, (_, i) => i));
			const original = new RawSource(buffer);
			const source = new CachedSource(original);

			// Populate _cachedSource with the Buffer
			source.source();
			source.size();

			const cachedData = source.getCachedData();
			assert.strictEqual(cachedData.source, false);

			// @ts-expect-error for tests
			const clone = new CachedSource(null, cachedData);
			assert.deepStrictEqual(clone.source(), source.source());
			assert.deepStrictEqual(clone.buffer(), source.buffer());
			assert.deepStrictEqual(clone.size(), source.size());
		});

		it("should hand out a recorded hash update without a big string", () => {
			const big = "a".repeat(200000);
			const source = new CachedSource(new OriginalSource(big, "big.js"));
			const internal = /** @type {{ _cachedHashUpdate: unknown[] }} */ (
				/** @type {unknown} */ (source)
			);

			source.updateHash(crypto.createHash("md5"));

			// a source nobody asks cached data of keeps its own string, uncopied
			assert.ok(internal._cachedHashUpdate.includes(big));

			const cachedData = source.getCachedData();
			assert.notStrictEqual(cachedData.hash, undefined);
			for (const item of /** @type {(string | Buffer)[]} */ (cachedData.hash)) {
				assert.notStrictEqual(typeof item, "string");
			}

			// asking again encodes nothing: the recording already holds buffers
			assert.strictEqual(source.getCachedData().hash, cachedData.hash);

			// @ts-expect-error for tests
			const clone = new CachedSource(null, cachedData);
			const cloneHash = crypto.createHash("md5");
			clone.updateHash(cloneHash);
			const sourceHash = crypto.createHash("md5");
			source.updateHash(sourceHash);
			assert.strictEqual(cloneHash.digest("hex"), sourceHash.digest("hex"));
		});

		it("should allocate no map cache until a map is asked for", () => {
			const original = new OriginalSource("Hello World", "hello.txt");
			const source = new CachedSource(original);
			const mapCache = () =>
				/** @type {{ _cachedMaps: Map<string, unknown> | undefined }} */ (
					/** @type {unknown} */ (source)
				)._cachedMaps;

			source.source();
			source.buffer();
			source.size();
			source.updateHash(crypto.createHash("md5"));
			source.getCachedData();
			source.clearCache();
			assert.strictEqual(mapCache(), undefined);

			assert.deepStrictEqual(source.map({}), original.map({}));
			assert.strictEqual(mapCache() instanceof Map, true);
			assert.deepStrictEqual(
				source.sourceAndMap({}),
				original.sourceAndMap({}),
			);

			source.clearCache();
			assert.strictEqual(
				/** @type {Map<string, unknown>} */ (mapCache()).size,
				0,
			);
			assert.deepStrictEqual(source.map({}), original.map({}));
		});

		it("should stream a source whose map cache was never created", () => {
			const original = new OriginalSource("Hello World", "hello.txt");
			const source = new CachedSource(original);
			const chunks = [];

			source.source();
			streamChunks(
				source,
				{ finalSource: false, columns: true },
				(chunk) => chunks.push(chunk),
				() => {},
				() => {},
			);

			assert.deepStrictEqual(chunks, ["Hello World"]);
		});
	});
}
