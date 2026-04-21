"use strict";

describe("package-entry", () => {
	// eslint-disable-next-line jest/expect-expect
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
			"CompatSource",
		]) {
			expect(require("../")[name]).toBe(require(`../lib/${name}`));
			expect(require("../")[name]).toBe(require(`../lib/${name}`));
		}
	});

	it("should expose util.stringBufferUtils", () => {
		const { util } = require("../");

		expect(util.stringBufferUtils).toBe(
			require("../lib/helpers/stringBufferUtils"),
		);
		expect(typeof util.stringBufferUtils.isDualStringBufferCachingEnabled).toBe(
			"function",
		);
		expect(typeof util.stringBufferUtils.enableDualStringBufferCaching).toBe(
			"function",
		);
		expect(typeof util.stringBufferUtils.disableDualStringBufferCaching).toBe(
			"function",
		);
		expect(typeof util.stringBufferUtils.enterStringInterningRange).toBe(
			"function",
		);
		expect(typeof util.stringBufferUtils.exitStringInterningRange).toBe(
			"function",
		);
		expect(typeof util.stringBufferUtils.internString).toBe("function");
	});
});
