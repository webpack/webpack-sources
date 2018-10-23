var should = require("should");
var CachedSource = require("../lib/CachedSource");
var OriginalSource = require('../lib/OriginalSource');

describe("CachedSource", function() {
	it("should return the correct size for binary files", function() {
		var source = new OriginalSource(new ArrayBuffer(256), "file.wasm");
		var cachedSource = new CachedSource(source);

		cachedSource.size().should.be.eql(256);
		cachedSource.size().should.be.eql(256);
	});

	it("should return the correct size for cached binary sources", function() {
		var source = new OriginalSource(new ArrayBuffer(256), "file.wasm");
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
});
