describe("package-entry", function() {
	it("should not throw SyntaxError", function() {
		require("../");
	});
	it("should expose Sources", function() {
		for (const name of [
			"Source",
			"CachedSource",
			"ConcatSource",
			"OriginalSource",
			"PrefixSource",
			"RawSource",
			"ReplaceSource",
			"SizeOnlySource",
			"SourceMapSource"
		]) {
			require("../")[name].should.be.equal(require("../lib/" + name));
			require("../")[name].should.be.equal(require("../lib/" + name));
		}
	});
});
