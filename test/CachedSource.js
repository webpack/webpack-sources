require("should");
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

describe("CachedSource", function() {
	it("should return the correct size for binary files", function() {
		var source = new OriginalSource(Buffer.from(new Array(256)), "file.wasm");
		var cachedSource = new CachedSource(source);

		cachedSource.size().should.be.eql(256);
		cachedSource.size().should.be.eql(256);
	});

	it("should return the correct size for cached binary sources", function() {
		var source = new OriginalSource(Buffer.from(new Array(256)), "file.wasm");
		var cachedSource = new CachedSource(source);

		cachedSource.source();
		cachedSource.size().should.be.eql(256);
		cachedSource.size().should.be.eql(256);
	});

	it("should return the correct size for text files", function() {
		var source = new OriginalSource("TestTestTest", "file.js");
		var cachedSource = new CachedSource(source);

		cachedSource.size().should.be.eql(12);
		cachedSource.size().should.be.eql(12);
	});

	it("should return the correct size for cached text files", function() {
		var source = new OriginalSource("TestTestTest", "file.js");
		var cachedSource = new CachedSource(source);

		cachedSource.source();
		cachedSource.size().should.be.eql(12);
		cachedSource.size().should.be.eql(12);
	});

	it("should return the correct size for unicode files", function() {
		var source = new OriginalSource("😋", "file.js");
		var cachedSource = new CachedSource(source);

		cachedSource.size().should.be.eql(4);
		cachedSource.size().should.be.eql(4);
	});

	it("should return the correct size for cached unicode files", function() {
		var source = new OriginalSource("😋", "file.js");
		var cachedSource = new CachedSource(source);

		cachedSource.source();
		cachedSource.size().should.be.eql(4);
		cachedSource.size().should.be.eql(4);
	});

	it("should use the source cache for all other calls", function() {
		var source = new TrackedSource(
			new OriginalSource("TestTestTest", "file.js")
		);
		var cachedSource = new CachedSource(source);

		cachedSource.source().should.be.eql("TestTestTest");
		cachedSource.size().should.be.eql(12);
		cachedSource
			.buffer()
			.toString("utf-8")
			.should.be.eql("TestTestTest");
		source.getCalls().should.be.eql({
			size: 0,
			source: 1,
			buffer: 0,
			map: 0,
			sourceAndMap: 0
		});
	});
	it("should use the source cache for all other calls", function() {
		var source = new TrackedSource(
			new OriginalSource("TestTestTest", "file.js")
		);
		var cachedSource = new CachedSource(source);

		cachedSource.source().should.be.eql("TestTestTest");
		cachedSource.source().should.be.eql("TestTestTest");
		cachedSource.size().should.be.eql(12);
		cachedSource.size().should.be.eql(12);
		cachedSource
			.buffer()
			.toString("utf-8")
			.should.be.eql("TestTestTest");
		cachedSource
			.buffer()
			.toString("utf-8")
			.should.be.eql("TestTestTest");
		cachedSource.sourceAndMap().source.should.be.eql("TestTestTest");
		cachedSource.sourceAndMap().map.should.have.type("object");
		cachedSource.map().should.have.type("object");
		cachedSource.map().should.have.type("object");
		source.getCalls().should.be.eql({
			size: 0,
			source: 1,
			buffer: 0,
			map: 1,
			sourceAndMap: 0
		});
	});
	it("should not use buffer for source", function() {
		var source = new TrackedSource(
			new OriginalSource("TestTestTest", "file.js")
		);
		var cachedSource = new CachedSource(source);

		cachedSource.size().should.be.eql(12);
		cachedSource.size().should.be.eql(12);
		cachedSource
			.buffer()
			.toString("utf-8")
			.should.be.eql("TestTestTest");
		cachedSource
			.buffer()
			.toString("utf-8")
			.should.be.eql("TestTestTest");
		cachedSource.source().should.be.eql("TestTestTest");
		cachedSource.source().should.be.eql("TestTestTest");
		source.getCalls().should.be.eql({
			size: 1,
			source: 1,
			buffer: 1,
			map: 0,
			sourceAndMap: 0
		});
	});
	it("should use map for sourceAndMap", function() {
		var source = new TrackedSource(
			new OriginalSource("TestTestTest", "file.js")
		);
		var cachedSource = new CachedSource(source);

		cachedSource.map().should.have.type("object");
		cachedSource.map().should.have.type("object");
		cachedSource.sourceAndMap().source.should.be.eql("TestTestTest");
		cachedSource.sourceAndMap().map.should.have.type("object");
		cachedSource.size().should.be.eql(12);
		cachedSource.size().should.be.eql(12);
		cachedSource
			.buffer()
			.toString("utf-8")
			.should.be.eql("TestTestTest");
		cachedSource
			.buffer()
			.toString("utf-8")
			.should.be.eql("TestTestTest");
		cachedSource.source().should.be.eql("TestTestTest");
		cachedSource.source().should.be.eql("TestTestTest");
		source.getCalls().should.be.eql({
			size: 0,
			source: 1,
			buffer: 0,
			map: 1,
			sourceAndMap: 0
		});
	});
	it("should use binary source for buffer", function() {
		var buffer = Buffer.from(new Array(256));
		var source = new TrackedSource(new RawSource(buffer));
		var cachedSource = new CachedSource(source);

		cachedSource.sourceAndMap().source.should.be.equal(buffer);
		cachedSource.sourceAndMap().source.should.be.equal(buffer);
		cachedSource
			.sourceAndMap()
			.should.have.property("map")
			.be.equal(null);
		cachedSource.buffer().should.be.equal(buffer);
		cachedSource.buffer().should.be.equal(buffer);
		cachedSource.source().should.be.equal(buffer);
		cachedSource.source().should.be.equal(buffer);
		source.getCalls().should.be.eql({
			size: 0,
			source: 0,
			buffer: 0,
			map: 0,
			sourceAndMap: 1
		});
	});
	it("should use an old webpack-sources Source", function() {
		var buffer = Buffer.from(new Array(256));
		var source = new TrackedSource(new RawSource(buffer));
		source.buffer = undefined;
		var cachedSource = new CachedSource(source);

		cachedSource.buffer().should.be.equal(buffer);
		cachedSource.buffer().should.be.equal(buffer);
		cachedSource.source().should.be.equal(buffer);
		cachedSource.source().should.be.equal(buffer);
		source.getCalls().should.be.eql({
			size: 0,
			source: 1,
			buffer: 0,
			map: 0,
			sourceAndMap: 0
		});
	});
	it("should use an old webpack-sources Source", function() {
		var string = "Hello World";
		var source = new TrackedSource(new RawSource(string));
		source.buffer = undefined;
		var cachedSource = new CachedSource(source);

		const buffer = cachedSource.buffer();

		Buffer.isBuffer(buffer).should.be.eql(true);
		buffer.toString("utf-8").should.be.equal(string);
		cachedSource.buffer().should.be.equal(buffer);
		cachedSource.source().should.be.equal(string);
		cachedSource.source().should.be.equal(string);
		source.getCalls().should.be.eql({
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

		clone.source().should.be.eql(source.source());
		clone.buffer().should.be.eql(source.buffer());
		clone.size().should.be.eql(source.size());
		clone.map({}).should.be.eql(source.map({}));
		clone.sourceAndMap({}).should.be.eql(source.sourceAndMap({}));
	});

	it("should allow to store and restore cached data (without SourceMap)", () => {
		const source = new CachedSource(new RawSource("Hello World"));

		// fill up cache
		source.source();
		source.map({});
		source.size();

		const clone = new CachedSource(null, source.getCachedData());

		clone.source().should.be.eql(source.source());
		clone.buffer().should.be.eql(source.buffer());
		clone.size().should.be.eql(source.size());
		(clone.map({}) === null).should.be.true();
		clone.sourceAndMap({}).should.be.eql(source.sourceAndMap({}));
	});
});
