var CachedSource = require("../").CachedSource;
var OriginalSource = require("../").OriginalSource;
var RawSource = require("../").RawSource;
var Source = require("../").Source;

class TrackedSource extends Source {
	constructor(source) {
		super();
		this._innerSource = source;
		this.sizeCalled = 0;
		this.sourceCalled = 0;
		this.bufferCalled = 0;
		this.mapCalled = 0;
		this.sourceAndMapCalled = 0;
	}

	getCalls() {
		return {
			size: this.sizeCalled,
			source: this.sourceCalled,
			buffer: this.bufferCalled,
			map: this.mapCalled,
			sourceAndMap: this.sourceAndMapCalled
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
}

describe("CachedSource", () => {
	it("should return the correct size for binary files", () => {
		var source = new OriginalSource(Buffer.from(new Array(256)), "file.wasm");
		var cachedSource = new CachedSource(source);

		expect(cachedSource.size()).toBe(256);
		expect(cachedSource.size()).toBe(256);
	});

	it("should return the correct size for cached binary sources", () => {
		var source = new OriginalSource(Buffer.from(new Array(256)), "file.wasm");
		var cachedSource = new CachedSource(source);

		cachedSource.source();
		expect(cachedSource.size()).toBe(256);
		expect(cachedSource.size()).toBe(256);
	});

	it("should return the correct size for text files", () => {
		var source = new OriginalSource("TestTestTest", "file.js");
		var cachedSource = new CachedSource(source);

		expect(cachedSource.size()).toBe(12);
		expect(cachedSource.size()).toBe(12);
	});

	it("should return the correct size for cached text files", () => {
		var source = new OriginalSource("TestTestTest", "file.js");
		var cachedSource = new CachedSource(source);

		cachedSource.source();
		expect(cachedSource.size()).toBe(12);
		expect(cachedSource.size()).toBe(12);
	});

	it("should return the correct size for unicode files", () => {
		var source = new OriginalSource("😋", "file.js");
		var cachedSource = new CachedSource(source);

		expect(cachedSource.size()).toBe(4);
		expect(cachedSource.size()).toBe(4);
	});

	it("should return the correct size for cached unicode files", () => {
		var source = new OriginalSource("😋", "file.js");
		var cachedSource = new CachedSource(source);

		cachedSource.source();
		expect(cachedSource.size()).toBe(4);
		expect(cachedSource.size()).toBe(4);
	});

	it("should use the source cache for all other calls", () => {
		var source = new TrackedSource(
			new OriginalSource("TestTestTest", "file.js")
		);
		var cachedSource = new CachedSource(source);

		expect(cachedSource.source()).toBe("TestTestTest");
		expect(cachedSource.size()).toBe(12);
		expect(cachedSource.buffer().toString("utf-8")).toBe("TestTestTest");
		expect(source.getCalls()).toEqual({
			size: 0,
			source: 1,
			buffer: 0,
			map: 0,
			sourceAndMap: 0
		});
	});
	it("should use the source cache for all other calls", () => {
		var source = new TrackedSource(
			new OriginalSource("TestTestTest", "file.js")
		);
		var cachedSource = new CachedSource(source);

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
		expect(source.getCalls()).toEqual({
			size: 0,
			source: 1,
			buffer: 0,
			map: 1,
			sourceAndMap: 0
		});
	});
	it("should not use buffer for source", () => {
		var source = new TrackedSource(
			new OriginalSource("TestTestTest", "file.js")
		);
		var cachedSource = new CachedSource(source);

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
			sourceAndMap: 0
		});
	});
	it("should use map for sourceAndMap", () => {
		var source = new TrackedSource(
			new OriginalSource("TestTestTest", "file.js")
		);
		var cachedSource = new CachedSource(source);

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
			sourceAndMap: 0
		});
	});
	it("should use binary source for buffer", () => {
		var buffer = Buffer.from(new Array(256));
		var source = new TrackedSource(new RawSource(buffer));
		var cachedSource = new CachedSource(source);

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
			sourceAndMap: 1
		});
	});
	it("should use an old webpack-sources Source", () => {
		var buffer = Buffer.from(new Array(256));
		var source = new TrackedSource(new RawSource(buffer));
		source.buffer = undefined;
		var cachedSource = new CachedSource(source);

		expect(cachedSource.buffer()).toBe(buffer);
		expect(cachedSource.buffer()).toBe(buffer);
		expect(cachedSource.source()).toBe(buffer);
		expect(cachedSource.source()).toBe(buffer);
		expect(source.getCalls()).toEqual({
			size: 0,
			source: 1,
			buffer: 0,
			map: 0,
			sourceAndMap: 0
		});
	});
	it("should use an old webpack-sources Source", () => {
		var string = "Hello World";
		var source = new TrackedSource(new RawSource(string));
		source.buffer = undefined;
		var cachedSource = new CachedSource(source);

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
			sourceAndMap: 0
		});
	});

	it("should allow to store and restore cached data (with SourceMap)", () => {
		const source = new CachedSource(
			new OriginalSource("Hello World", "test.txt")
		);

		// fill up cache
		source.source();
		source.map({});
		source.size();

		const clone = new CachedSource(null, source.getCachedData());

		expect(clone.source()).toEqual(source.source());
		expect(clone.buffer()).toEqual(source.buffer());
		expect(clone.size()).toEqual(source.size());
		expect(clone.map({})).toEqual(source.map({}));
		expect(clone.sourceAndMap({})).toEqual(source.sourceAndMap({}));
	});

	it("should allow to store and restore cached data (without SourceMap)", () => {
		const source = new CachedSource(new RawSource("Hello World"));

		// fill up cache
		source.source();
		source.map({});
		source.size();

		const clone = new CachedSource(null, source.getCachedData());

		expect(clone.source()).toEqual(source.source());
		expect(clone.buffer()).toEqual(source.buffer());
		expect(clone.size()).toEqual(source.size());
		expect(clone.map({}) === null).toBe(true);
		expect(clone.sourceAndMap({})).toEqual(source.sourceAndMap({}));
	});
});
