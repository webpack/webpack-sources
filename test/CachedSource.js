jest.mock("../lib/helpers/createMappingsSerializer");
const crypto = require("crypto");
const CachedSource = require("../").CachedSource;
const OriginalSource = require("../").OriginalSource;
const RawSource = require("../").RawSource;
const Source = require("../").Source;
const streamChunks = require("../lib/helpers/streamChunks");

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
			hash: this.updateHashCalled
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

const getHash = source => {
	const hash = crypto.createHash("md5");
	source.updateHash(hash);
	return hash.digest("hex");
};

describe("CachedSource", () => {
	it("should return the correct size for binary files", () => {
		const source = new OriginalSource(Buffer.from(new Array(256)), "file.wasm");
		const cachedSource = new CachedSource(source);

		expect(cachedSource.size()).toBe(256);
		expect(cachedSource.size()).toBe(256);
	});

	it("should return the correct size for cached binary sources", () => {
		const source = new OriginalSource(Buffer.from(new Array(256)), "file.wasm");
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
		expect(cachedSource.buffer().toString("utf-8")).toBe("TestTestTest");
		expect(getHash(cachedSource)).toBe(getHash(original));
		expect(source.getCalls()).toEqual({
			size: 0,
			source: 1,
			buffer: 0,
			map: 0,
			sourceAndMap: 0,
			hash: 1
		});
	});
	it("should use the source cache for all other calls", () => {
		const original = new OriginalSource("TestTestTest", "file.js");
		const source = new TrackedSource(original);
		const cachedSource = new CachedSource(source);

		expect(cachedSource.source()).toBe("TestTestTest");
		expect(cachedSource.source()).toBe("TestTestTest");
		expect(cachedSource.size()).toBe(12);
		expect(cachedSource.size()).toBe(12);
		expect(cachedSource.buffer().toString("utf-8")).toBe("TestTestTest");
		expect(cachedSource.buffer().toString("utf-8")).toBe("TestTestTest");
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
			hash: 1
		});
	});
	it("should not use buffer for source", () => {
		const source = new TrackedSource(
			new OriginalSource("TestTestTest", "file.js")
		);
		const cachedSource = new CachedSource(source);

		expect(cachedSource.size()).toBe(12);
		expect(cachedSource.size()).toBe(12);
		expect(cachedSource.buffer().toString("utf-8")).toBe("TestTestTest");
		expect(cachedSource.buffer().toString("utf-8")).toBe("TestTestTest");
		expect(cachedSource.source()).toBe("TestTestTest");
		expect(cachedSource.source()).toBe("TestTestTest");
		expect(source.getCalls()).toEqual({
			size: 1,
			source: 1,
			buffer: 1,
			map: 0,
			sourceAndMap: 0,
			hash: 0
		});
	});
	it("should use map for sourceAndMap", () => {
		const source = new TrackedSource(
			new OriginalSource("TestTestTest", "file.js")
		);
		const cachedSource = new CachedSource(source);

		expect(typeof cachedSource.map()).toBe("object");
		expect(typeof cachedSource.map()).toBe("object");
		expect(cachedSource.sourceAndMap().source).toBe("TestTestTest");
		expect(typeof cachedSource.sourceAndMap().map).toBe("object");
		expect(cachedSource.size()).toBe(12);
		expect(cachedSource.size()).toBe(12);
		expect(cachedSource.buffer().toString("utf-8")).toBe("TestTestTest");
		expect(cachedSource.buffer().toString("utf-8")).toBe("TestTestTest");
		expect(cachedSource.source()).toBe("TestTestTest");
		expect(cachedSource.source()).toBe("TestTestTest");
		expect(source.getCalls()).toEqual({
			size: 0,
			source: 1,
			buffer: 0,
			map: 1,
			sourceAndMap: 0,
			hash: 0
		});
	});

	it("should use binary source for buffer", () => {
		const buffer = Buffer.from(new Array(256));
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
			hash: 0
		});
	});
	it("should use an old webpack-sources Source", () => {
		const buffer = Buffer.from(new Array(256));
		const source = new TrackedSource(new RawSource(buffer));
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
			hash: 0
		});
	});
	it("should use an old webpack-sources Source", () => {
		const string = "Hello World";
		const source = new TrackedSource(new RawSource(string));
		source.buffer = undefined;
		const cachedSource = new CachedSource(source);

		const buffer = cachedSource.buffer();

		expect(Buffer.isBuffer(buffer)).toBe(true);
		expect(buffer.toString("utf-8")).toBe(string);
		expect(cachedSource.buffer()).toBe(buffer);
		expect(cachedSource.source()).toBe(string);
		expect(cachedSource.source()).toBe(string);
		expect(source.getCalls()).toEqual({
			size: 0,
			source: 1,
			buffer: 0,
			map: 0,
			sourceAndMap: 0,
			hash: 0
		});
	});

	it("should include map in the cache if only streamChunks was computed", () => {
		const original = new OriginalSource("Hello World", "test.txt");
		const source = new TrackedSource(original);
		const cachedSource = new CachedSource(source);

		source.streamChunks = (...args) => streamChunks(original, ...args);

		// fill up cache
		cachedSource.streamChunks(
			{},
			() => {},
			() => {},
			() => {}
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

		const clone = new CachedSource(null, source.getCachedData());

		expect(clone.source()).toEqual(source.source());
		expect(clone.buffer()).toEqual(source.buffer());
		expect(clone.size()).toEqual(source.size());
		expect(clone.map({})).toEqual(source.map({}));
		expect(clone.sourceAndMap({})).toEqual(source.sourceAndMap({}));
		expect(getHash(clone)).toBe(getHash(original));

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

		const clone = new CachedSource(null, source.getCachedData());

		expect(clone.source()).toEqual(source.source());
		expect(clone.buffer()).toEqual(source.buffer());
		expect(clone.size()).toEqual(source.size());
		expect(clone.map({}) === null).toBe(true);
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
		expect(clone1.map({}) === null).toBe(true);
		expect(calls).toBe(1);
		expect(clone1.map({}) === null).toBe(true);
		expect(calls).toBe(1);
		expect(clone().sourceAndMap({})).toEqual(source.sourceAndMap({}));
		expect(calls).toBe(2);
		expect(getHash(clone())).toBe(getHash(original));
		expect(calls).toBe(3);
	});
});
