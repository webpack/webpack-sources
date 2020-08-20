describe("package-entry", () => {
	it("should not throw SyntaxError", () => {
		require("../");
	});
	it("should expose Sources", () => {
		for (const name of [
			"Source",
			"CachedSource",
			"ConcatSource",
			"OriginalSource",
			"PrefixSource",
			"RawSource",
			"ReplaceSource",
			"SizeOnlySource",
			"SourceMapSource",
			"CompatSource"
		]) {
			expect(require("../")[name]).toBe(require("../lib/" + name));
			expect(require("../")[name]).toBe(require("../lib/" + name));
		}
	});
});
