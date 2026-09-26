"use strict";

const assert = require("assert");
const { describe, it } = require("node:test");

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
			"CompatSource",
		]) {
			assert.strictEqual(require("../")[name], require(`../lib/${name}`));
			assert.strictEqual(require("../")[name], require(`../lib/${name}`));
		}
	});

	it("should expose util.stringBufferUtils", () => {
		const { util } = require("../");

		assert.strictEqual(
			util.stringBufferUtils,
			require("../lib/helpers/stringBufferUtils"),
		);
		assert.strictEqual(
			typeof util.stringBufferUtils.isDualStringBufferCachingEnabled,
			"function",
		);
		assert.strictEqual(
			typeof util.stringBufferUtils.enableDualStringBufferCaching,
			"function",
		);
		assert.strictEqual(
			typeof util.stringBufferUtils.disableDualStringBufferCaching,
			"function",
		);
		assert.strictEqual(
			typeof util.stringBufferUtils.enterStringInterningRange,
			"function",
		);
		assert.strictEqual(
			typeof util.stringBufferUtils.exitStringInterningRange,
			"function",
		);
		assert.strictEqual(typeof util.stringBufferUtils.internString, "function");
	});
});
