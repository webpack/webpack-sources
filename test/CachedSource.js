"use strict";

jest.mock("./__mocks__/createMappingsSerializer");

const crypto = require("crypto");
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

describe.each([
	{
		enableMemoryOptimizations: false,
	},
	{
		enableMemoryOptimizations: true,
	},
])("cachedSource %s", ({ enableMemoryOptimizations }) => {
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

		expect(cachedSource.size()).toBe(256);
		expect(cachedSource.size()).toBe(256);
	});

	it("should return the correct size for cached binary sources", () => {
		const source = new OriginalSource(
			Buffer.from(Array.from({ length: 256 })),
			"file.wasm",
		);
		const cachedSource = new CachedSource(source);

		cachedSource.source();
		expect(cachedSource.size()).toBe(256);
		expect(cachedSource.size()).toBe(256);
	});

	it("should return the correct size for text files", () => {
		const source = new OriginalSource("TestTestTest", "file.js");
		const cachedSource = new CachedSource(source);

		expect(cachedSource.size()).toBe(12);
		expect(cachedSource.size()).toBe(12);
	});

	it("should return the correct size for cached text files", () => {
		const source = new OriginalSource("TestTestTest", "file.js");
		const cachedSource = new CachedSource(source);

		cachedSource.source();
		expect(cachedSource.size()).toBe(12);
		expect(cachedSource.size()).toBe(12);
	});

	it("should return the correct size for unicode files", () => {
		const source = new OriginalSource("😋", "file.js");
		const cachedSource = new CachedSource(source);

		expect(cachedSource.size()).toBe(4);
		expect(cachedSource.size()).toBe(4);
	});

	it("should return the correct size for cached unicode files", () => {
		const source = new OriginalSource("😋", "file.js");
		const cachedSource = new CachedSource(source);

		cachedSource.source();
		expect(cachedSource.size()).toBe(4);
		expect(cachedSource.size()).toBe(4);
	});

	it("should use the source cache for all other calls", () => {
		const original = new OriginalSource("TestTestTest", "file.js");
		const source = new TrackedSource(original);
		const cachedSource = new CachedSource(source);

		expect(cachedSource.source()).toBe("TestTestTest");
		expect(cachedSource.size()).toBe(12);
		expect(cachedSource.buffer().toString("utf8")).toBe("TestTestTest");
		expect(getHash(cachedSource)).toBe(getHash(original));
		expect(source.getCalls()).toEqual({
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

		expect(cachedSource.source()).toBe("TestTestTest");
		expect(cachedSource.source()).toBe("TestTestTest");
		expect(cachedSource.size()).toBe(12);
		expect(cachedSource.size()).toBe(12);
		expect(cachedSource.buffer().toString("utf8")).toBe("TestTestTest");
		expect(cachedSource.buffer().toString("utf8")).toBe("TestTestTest");
		expect(cachedSource.sourceAndMap().source).toBe("TestTestTest");
		expect(typeof cachedSource.sourceAndMap().map).toBe("object");
		expect(typeof cachedSource.map()).toBe("object");
		expect(typeof cachedSource.map()).toBe("object");
		expect(getHash(cachedSource)).toBe(getHash(original));
		expect(source.getCalls()).toEqual({
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

		expect(cachedSource.size()).toBe(12);
		expect(cachedSource.size()).toBe(12);
		expect(cachedSource.buffer().toString("utf8")).toBe("TestTestTest");
		expect(cachedSource.buffer().toString("utf8")).toBe("TestTestTest");
		expect(cachedSource.source()).toBe("TestTestTest");
		expect(cachedSource.source()).toBe("TestTestTest");
		expect(source.getCalls()).toEqual({
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

		expect(typeof cachedSource.map()).toBe("object");
		expect(typeof cachedSource.map()).toBe("object");
		expect(cachedSource.sourceAndMap().source).toBe("TestTestTest");
		expect(typeof cachedSource.sourceAndMap().map).toBe("object");
		expect(cachedSource.size()).toBe(12);
		expect(cachedSource.size()).toBe(12);
		expect(cachedSource.buffer().toString("utf8")).toBe("TestTestTest");
		expect(cachedSource.buffer().toString("utf8")).toBe("TestTestTest");
		expect(cachedSource.source()).toBe("TestTestTest");
		expect(cachedSource.source()).toBe("TestTestTest");
		expect(source.getCalls()).toEqual({
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

		expect(cachedSource.sourceAndMap().source).toBe(buffer);
		expect(cachedSource.sourceAndMap().source).toBe(buffer);
		expect(cachedSource.sourceAndMap()).toHaveProperty("map", null);
		expect(cachedSource.buffer()).toBe(buffer);
		expect(cachedSource.buffer()).toBe(buffer);
		expect(cachedSource.source()).toBe(buffer);
		expect(cachedSource.source()).toBe(buffer);
		expect(source.getCalls()).toEqual({
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

		expect(cachedSource.buffer()).toBe(buffer);
		expect(cachedSource.buffer()).toBe(buffer);
		expect(cachedSource.source()).toBe(buffer);
		expect(cachedSource.source()).toBe(buffer);
		expect(source.getCalls()).toEqual({
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

		expect(Buffer.isBuffer(buffer)).toBe(true);
		expect(buffer.toString("utf8")).toBe(string);
		expect(
			enableMemoryOptimizations
				? cachedSource.buffer().equals(buffer)
				: cachedSource.buffer(),
		).toBe(enableMemoryOptimizations ? true : buffer);
		expect(cachedSource.source()).toBe(string);
		expect(cachedSource.source()).toBe(string);
		expect(source.getCalls()).toEqual({
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
		expect(cachedData.maps.size).toBe(1);
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

		expect(clone.source()).toEqual(source.source());
		expect(clone.buffer()).toEqual(source.buffer());
		expect(clone.size()).toEqual(source.size());
		expect(clone.map({})).toEqual(source.map({}));
		expect(clone.sourceAndMap({})).toEqual(source.sourceAndMap({}));
		expect(getHash(clone)).toBe(getHash(original));

		// @ts-expect-error for tests
		const clone2 = new CachedSource(null, clone.getCachedData());

		expect(clone2.source()).toEqual(source.source());
		expect(clone2.buffer()).toEqual(source.buffer());
		expect(clone2.size()).toEqual(source.size());
		expect(clone2.map({})).toEqual(source.map({}));
		expect(clone2.sourceAndMap({})).toEqual(source.sourceAndMap({}));
		expect(getHash(clone2)).toBe(getHash(original));
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

		expect(clone.source()).toEqual(source.source());
		expect(clone.buffer()).toEqual(source.buffer());
		expect(clone.size()).toEqual(source.size());
		expect(clone.map({})).toBeNull();
		expect(clone.sourceAndMap({})).toEqual(source.sourceAndMap({}));
		expect(getHash(clone)).toBe(getHash(original));
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

		expect(clone().source()).toEqual(source.source());
		expect(clone().buffer()).toEqual(source.buffer());
		expect(clone().size()).toEqual(source.size());
		expect(calls).toBe(0);
		const clone1 = clone();
		expect(clone1.map({})).toBeNull();
		expect(calls).toBe(1);
		expect(clone1.map({})).toBeNull();
		expect(calls).toBe(1);
		expect(clone().sourceAndMap({})).toEqual(source.sourceAndMap({}));
		expect(calls).toBe(2);
		expect(getHash(clone())).toBe(getHash(original));
		expect(calls).toBe(3);
	});

	it("should expose originalLazy (function form) and original()", () => {
		const original = new RawSource("Hello World");
		const lazy = () => original;
		const source = new CachedSource(lazy);
		expect(source.originalLazy()).toBe(lazy);
		expect(source.original()).toBe(original);
		// After original() resolves the function, originalLazy returns the resolved source
		expect(source.originalLazy()).toBe(original);
	});

	it("should compute size from cached buffer when _cachedSize is undefined", () => {
		const buffer = Buffer.from("Hello World");
		// Provide cachedData with buffer but no size
		const cachedSource = new CachedSource(new RawSource("Hello World"), {
			buffer,
			maps: new Map(),
		});
		expect(cachedSource.size()).toBe(buffer.length);
		expect(cachedSource.size()).toBe(buffer.length);
	});

	it("should return null for missing map when cached entry is empty", () => {
		const cachedSource = new CachedSource(new RawSource("Hello World"), {
			buffer: Buffer.from("Hello World"),
			size: 11,
			maps: new Map([["{}", {}]]),
		});
		expect(cachedSource.map()).toBeNull();
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

		expect(digestA).toBe(digestB);
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

		expect(digestA).toBe(digestB);
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
		expect(chunks.length).toBeGreaterThan(0);
	});

	it("should return Buffer[] from buffers() and delegate to the original source", () => {
		const original = new ConcatSource(
			new RawSource(Buffer.from("hello ")),
			new RawSource(Buffer.from("world")),
		);
		const cachedSource = new CachedSource(original);

		const buffers = cachedSource.buffers();
		expect(Array.isArray(buffers)).toBe(true);
		expect(buffers).toHaveLength(2);
		expect(Buffer.concat(buffers).toString("utf8")).toBe("hello world");
		// The second call should return the cached array
		expect(cachedSource.buffers()).toBe(buffers);
	});

	it("should return a single-entry Buffer[] from buffers() when buffer is already cached", () => {
		const buffer = Buffer.from("cached");
		const original = new RawSource(buffer);
		const cachedSource = new CachedSource(original);
		// Populate the buffer cache
		cachedSource.buffer();
		const buffers = cachedSource.buffers();
		expect(buffers).toHaveLength(1);
		expect(buffers[0]).toBe(buffer);
	});

	it("should round-trip CachedSource with a Buffer-backed source", () => {
		const buffer = Buffer.from(Array.from({ length: 64 }, (_, i) => i));
		const original = new RawSource(buffer);
		const source = new CachedSource(original);

		// Populate _cachedSource with the Buffer
		source.source();
		source.size();

		const cachedData = source.getCachedData();
		expect(cachedData.source).toBe(false);

		// @ts-expect-error for tests
		const clone = new CachedSource(null, cachedData);
		expect(clone.source()).toEqual(source.source());
		expect(clone.buffer()).toEqual(source.buffer());
		expect(clone.size()).toEqual(source.size());
	});
});
