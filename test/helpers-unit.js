"use strict";

const {
	getMap,
	getSourceAndMap,
} = require("../lib/helpers/getFromStreamChunks");
const getGeneratedSourceInfo = require("../lib/helpers/getGeneratedSourceInfo");
const getSource = require("../lib/helpers/getSource");
const readMappings = require("../lib/helpers/readMappings");
const splitIntoLines = require("../lib/helpers/splitIntoLines");
const splitIntoPotentialTokens = require("../lib/helpers/splitIntoPotentialTokens");
const streamAndGetSourceAndMap = require("../lib/helpers/streamAndGetSourceAndMap");
const {
	disableDualStringBufferCaching,
	enableDualStringBufferCaching,
	enterStringInterningRange,
	exitStringInterningRange,
	internString,
	isDualStringBufferCachingEnabled,
} = require("../lib/helpers/stringBufferUtils");

describe("getGeneratedSourceInfo", () => {
	it("should return empty object when source is undefined", () => {
		expect(getGeneratedSourceInfo(undefined)).toEqual({});
	});

	it("should return correct info for single line", () => {
		const info = getGeneratedSourceInfo("hello world");
		expect(info).toEqual({
			generatedLine: 1,
			generatedColumn: 11,
			source: "hello world",
		});
	});

	it("should return correct info for multi-line source", () => {
		const info = getGeneratedSourceInfo("hello\nworld\nfoo");
		expect(info.generatedLine).toBe(3);
		expect(info.generatedColumn).toBe(3);
	});

	it("should count newlines accurately for trailing newline", () => {
		const info = getGeneratedSourceInfo("a\nb\n");
		expect(info.generatedLine).toBe(3);
		expect(info.generatedColumn).toBe(0);
	});

	it("should handle empty string as single empty line", () => {
		const info = getGeneratedSourceInfo("");
		expect(info).toEqual({
			generatedLine: 1,
			generatedColumn: 0,
			source: "",
		});
	});
});

describe("getSource", () => {
	const baseMap = {
		version: 3,
		sources: ["a.js", "b.js"],
		names: [],
		mappings: "",
		file: "x",
	};

	it("should return null for negative index", () => {
		expect(getSource(baseMap, -1)).toBeNull();
	});

	it("should return source as-is when no sourceRoot", () => {
		expect(getSource(baseMap, 0)).toBe("a.js");
		expect(getSource(baseMap, 1)).toBe("b.js");
	});

	it("should prefix sourceRoot without trailing slash", () => {
		expect(getSource({ ...baseMap, sourceRoot: "src" }, 0)).toBe("src/a.js");
	});

	it("should prefix sourceRoot with trailing slash", () => {
		expect(getSource({ ...baseMap, sourceRoot: "src/" }, 0)).toBe("src/a.js");
	});
});

describe("splitIntoLines", () => {
	it("should split simple lines", () => {
		expect(splitIntoLines("a\nb\nc")).toEqual(["a\n", "b\n", "c"]);
	});

	it("should handle trailing newline", () => {
		expect(splitIntoLines("a\nb\n")).toEqual(["a\n", "b\n"]);
	});

	it("should handle empty string", () => {
		expect(splitIntoLines("")).toEqual([]);
	});
});

describe("splitIntoPotentialTokens", () => {
	it("should split tokens from a non-empty string", () => {
		const result = splitIntoPotentialTokens("a b c");
		expect(result).not.toBeNull();
	});

	it("should return null for empty string", () => {
		expect(splitIntoPotentialTokens("")).toBeNull();
	});
});

describe("readMappings", () => {
	it("should ignore out-of-range characters", () => {
		const mappings = [];
		// The tilde char (charCode 126) is out of the ccToValue range
		readMappings("AAAA~;AAAA", (...args) => {
			mappings.push(args);
		});
		expect(mappings).toHaveLength(2);
		expect(mappings[0]).toEqual([1, 0, 0, 1, 0, -1]);
	});

	it("should handle empty mappings", () => {
		const mappings = [];
		readMappings("", (...args) => {
			mappings.push(args);
		});
		expect(mappings).toHaveLength(0);
	});

	it("should parse simple mapping with source", () => {
		const mappings = [];
		readMappings("AAAA", (...args) => {
			mappings.push(args);
		});
		expect(mappings).toHaveLength(1);
		expect(mappings[0]).toEqual([1, 0, 0, 1, 0, -1]);
	});

	it("should parse mapping with name", () => {
		const mappings = [];
		readMappings("AAAAA", (...args) => {
			mappings.push(args);
		});
		expect(mappings).toHaveLength(1);
		expect(mappings[0]).toEqual([1, 0, 0, 1, 0, 0]);
	});

	it("should parse multiple lines", () => {
		const mappings = [];
		readMappings("AAAA;AACA", (...args) => {
			mappings.push(args);
		});
		expect(mappings).toHaveLength(2);
	});

	it("should preserve negative cumulative deltas (signed VLQ)", () => {
		// Second segment "CAAD" emits deltas (+1, 0, 0, -1) which drives
		// originalColumn negative. With an unsigned accumulator this would
		// wrap to 4294967295.
		const mappings = [];
		readMappings("AAAA;CAAD", (...args) => {
			mappings.push(args);
		});
		expect(mappings).toHaveLength(2);
		expect(mappings[0]).toEqual([1, 0, 0, 1, 0, -1]);
		expect(mappings[1]).toEqual([2, 1, 0, 1, -1, -1]);
	});
});

describe("getFromStreamChunks", () => {
	// A SourceLike with streamChunks that emits non-sequential indices so
	// getMap/getSourceAndMap's gap-fill loops run.
	const makeSparseSource = () => ({
		streamChunks(options, onChunk, onSource, onName) {
			onSource(0, "first.js", "first content");
			// jump from 0 to 2, leaving index 1 empty
			onSource(2, "third.js", "third content");
			onName(0, "alpha");
			onName(2, "gamma");
			onChunk("x", 1, 0, 0, 1, 0, 0);
			onChunk("y", 1, 1, 2, 1, 0, 2);
			return { generatedLine: 1, generatedColumn: 2, source: "xy" };
		},
	});

	it("getMap fills missing source and name indices with null", () => {
		const map =
			/** @type {import("../lib/Source").RawSourceMap} */
			(getMap(makeSparseSource()));
		expect(map).not.toBeNull();
		expect(map.sources).toEqual(["first.js", null, "third.js"]);
		expect(map.sourcesContent).toEqual([
			"first content",
			null,
			"third content",
		]);
		expect(map.names).toEqual(["alpha", null, "gamma"]);
	});

	it("getSourceAndMap fills missing source and name indices with null", () => {
		const { map, source } = getSourceAndMap(makeSparseSource());
		const m = /** @type {import("../lib/Source").RawSourceMap} */ (map);
		expect(source).toBe("xy");
		expect(m).not.toBeNull();
		expect(m.sources).toEqual(["first.js", null, "third.js"]);
		expect(m.sourcesContent).toEqual(["first content", null, "third content"]);
		expect(m.names).toEqual(["alpha", null, "gamma"]);
	});

	it("getMap returns null when no mappings are produced", () => {
		const emptySource = {
			streamChunks() {
				return { generatedLine: 1, generatedColumn: 0, source: "" };
			},
		};
		expect(getMap(emptySource)).toBeNull();
	});
});

describe("streamAndGetSourceAndMap", () => {
	it("fills missing source and name indices and returns a map", () => {
		const sparseSource = {
			streamChunks(options, onChunk, onSource, onName) {
				onSource(0, "first.js", "first content");
				onSource(2, "third.js", "third content");
				onName(0, "alpha");
				onName(2, "gamma");
				onChunk("x", 1, 0, 0, 1, 0, 0);
				onChunk("y", 1, 1, 2, 1, 0, 2);
				return { generatedLine: 1, generatedColumn: 2, source: "xy" };
			},
		};
		const chunks = [];
		const sources = [];
		const names = [];
		const result = streamAndGetSourceAndMap(
			// @ts-expect-error for tests
			sparseSource,
			{},
			(...args) => {
				chunks.push(args);
			},
			(...args) => {
				sources.push(args);
			},
			(...args) => {
				names.push(args);
			},
		);
		const { map: rawMap } = result;
		const map = /** @type {import("../lib/Source").RawSourceMap} */ (rawMap);
		expect(result.source).toBe("xy");
		expect(map.sources).toEqual(["first.js", null, "third.js"]);
		expect(map.names).toEqual(["alpha", null, "gamma"]);
		expect(chunks).toHaveLength(2);
		expect(sources).toHaveLength(2);
		expect(names).toHaveLength(2);
	});
});

describe("stringBufferUtils", () => {
	afterEach(() => {
		enableDualStringBufferCaching();
	});

	it("should toggle dual string buffer caching", () => {
		expect(isDualStringBufferCachingEnabled()).toBe(true);
		disableDualStringBufferCaching();
		expect(isDualStringBufferCachingEnabled()).toBe(false);
		enableDualStringBufferCaching();
		expect(isDualStringBufferCachingEnabled()).toBe(true);
	});

	it("should intern strings only when interning is enabled", () => {
		const big = "a".repeat(200);
		const big2 = `${"a".repeat(199)}a`;
		// Ensure we start from a clean slate
		expect(internString(big)).toBe(big);

		enterStringInterningRange();
		try {
			const interned1 = internString(big);
			const interned2 = internString(big2);
			expect(interned1).toBe(big);
			// Both strings have same content so should be deduplicated
			expect(interned2).toBe(interned1);
		} finally {
			exitStringInterningRange();
		}
	});

	it("should not intern short strings", () => {
		enterStringInterningRange();
		try {
			const shortStr = "short";
			expect(internString(shortStr)).toBe(shortStr);
		} finally {
			exitStringInterningRange();
		}
	});

	it("should not intern falsy strings", () => {
		enterStringInterningRange();
		try {
			expect(internString("")).toBe("");
		} finally {
			exitStringInterningRange();
		}
	});

	it("should nest interning ranges properly", () => {
		enterStringInterningRange();
		enterStringInterningRange();
		const big = "b".repeat(200);
		const interned1 = internString(big);
		exitStringInterningRange();
		// Still enabled because one range is still open
		const interned2 = internString(big);
		expect(interned2).toBe(interned1);
		exitStringInterningRange();
		// Now disabled; cache should be cleared, fresh string returned as-is
		const freshStr = "c".repeat(200);
		expect(internString(freshStr)).toBe(freshStr);
	});
});
