"use strict";

const ConcatSource = require("../lib/ConcatSource");
const OriginalSource = require("../lib/OriginalSource");
const SourceMapSource = require("../lib/SourceMapSource");
const createGeneratedRangesSerializer = require("../lib/helpers/createGeneratedRangesSerializer");
const createOriginalScopesSerializer = require("../lib/helpers/createOriginalScopesSerializer");
const readAllOriginalScopes = require("../lib/helpers/readAllOriginalScopes");
const readGeneratedRanges = require("../lib/helpers/readGeneratedRanges");
const readOriginalScopes = require("../lib/helpers/readOriginalScopes");
const {
	END_SEGMENT,
	NEXT_LINE,
	readTokens,
	valueAsToken,
} = require("../lib/helpers/vlq");

describe("Source Map Scopes Proposal", () => {
	describe("vlq.valueAsToken/readTokens round-trip", () => {
		const cases = [0, 1, -1, 15, -15, 16, -16, 1023, -1023, 1000000, -1000000];
		for (const value of cases) {
			it(`encodes and decodes ${value}`, () => {
				const encoded = valueAsToken(value);
				/** @type {number[]} */
				const decoded = [];
				readTokens(encoded, (control, data) => {
					if (control === 0) decoded.push(data);
				});
				expect(decoded).toEqual([value]);
			});
		}

		it("emits END_SEGMENT and NEXT_LINE controls", () => {
			let input = "";
			input += valueAsToken(5);
			input += ",";
			input += valueAsToken(-3);
			input += ";";
			input += valueAsToken(7);
			/** @type {[number, number][]} */
			const out = [];
			readTokens(input, (control, data) => {
				out.push([control, data]);
			});
			expect(out).toEqual([
				[0, 5],
				[END_SEGMENT, 0],
				[0, -3],
				[NEXT_LINE, 0],
				[0, 7],
			]);
		});
	});

	describe("originalScopes serializer/reader round-trip", () => {
		it("round-trips a nested scope with a named function", () => {
			const ser = createOriginalScopesSerializer();
			// Outer (module) scope — line 1, column 0, kind 0, flags 0
			let encoded = "";
			encoded += ser(1, 0, 0, 0, -1, undefined);
			// Inner (function `foo`) scope — line 2, column 2, kind 1, flags 1 (HAS_NAME), name index 0, variables [1,2]
			encoded += ser(2, 2, 1, 1, 0, [1, 2]);
			// End of inner
			encoded += ser(10, 1, -1, -1, -1, undefined);
			// End of outer
			encoded += ser(12, 0, -1, -1, -1, undefined);

			/** @type {[number, number, number, number, number, number, number[]][]} */
			const calls = [];
			readOriginalScopes(0, encoded, (...args) => {
				// Copy variables to snapshot its state at call-time
				calls.push([
					args[0],
					args[1],
					args[2],
					args[3],
					args[4],
					args[5],
					[...args[6]],
				]);
			});

			expect(calls).toEqual([
				[0, 1, 0, 0, 0, -1, []],
				[0, 2, 2, 1, 1, 0, [1, 2]],
				[0, 10, 1, -1, -1, -1, []],
				[0, 12, 0, -1, -1, -1, []],
			]);
		});
	});

	describe("generatedRanges serializer/reader round-trip", () => {
		it("round-trips ranges with a definition reference", () => {
			const ser = createGeneratedRangesSerializer();
			let encoded = "";
			// Range start at line 1, column 0, flags=1 (HAS_DEFINITION), definition=[0,0]
			encoded += ser(1, 0, 1, [0, 0], undefined, undefined);
			// Range end at line 3, column 5
			encoded += ser(3, 5, -1, undefined, undefined, undefined);

			/** @type {[number, number, number, unknown, unknown, unknown][]} */
			const calls = [];
			readGeneratedRanges(
				encoded,
				(line, column, flags, def, callsite, bindings) => {
					calls.push([
						line,
						column,
						flags,
						def && [...def],
						callsite && [...callsite],
						bindings && bindings.map((b) => [...b]),
					]);
				},
			);
			expect(calls).toEqual([
				[1, 0, 1, [0, 0], undefined, []],
				[3, 5, -1, undefined, undefined, undefined],
			]);
		});
	});

	describe("readAllOriginalScopes", () => {
		it("walks each per-source scope string", () => {
			const ser0 = createOriginalScopesSerializer();
			const ser1 = createOriginalScopesSerializer();
			const a = ser0(1, 0, 0, 0, -1, undefined);
			const b = ser1(2, 0, 0, 0, -1, undefined);
			/** @type {number[]} */
			const seen = [];
			readAllOriginalScopes([a, b], (sourceIndex) => {
				seen.push(sourceIndex);
			});
			expect(seen).toEqual([0, 1]);
		});

		it("ignores undefined/non-array input", () => {
			/** @type {unknown[]} */
			const seen = [];
			readAllOriginalScopes(undefined, () => seen.push(1));
			readAllOriginalScopes(
				/** @type {string[]} */ (/** @type {unknown} */ ("not-an-array")),
				() => seen.push(2),
			);
			expect(seen).toEqual([]);
		});
	});

	describe("SourceMapSource.map preserves originalScopes/generatedRanges", () => {
		// Encode a tiny scopes payload so we have deterministic VLQ strings.
		const scopesSer = createOriginalScopesSerializer();
		const originalScope =
			scopesSer(1, 0, 0, 0, -1, undefined) +
			scopesSer(5, 0, -1, -1, -1, undefined);

		const rangesSer = createGeneratedRangesSerializer();
		const generatedRange =
			rangesSer(1, 0, 1, [0, 0], undefined, undefined) +
			rangesSer(3, 0, -1, undefined, undefined, undefined);

		const sourceMap = {
			version: 3,
			file: "x.js",
			sources: ["a.js"],
			sourcesContent: ["const a = 1;\nconst b = 2;\n"],
			names: [],
			mappings: "AAAA;AACA;",
			originalScopes: [originalScope],
			generatedRanges: generatedRange,
		};
		const generated = "var a=1;\nvar b=2;\n";

		it("sourceMapSource.map() forwards scopes/ranges verbatim when no inner map", () => {
			const src = new SourceMapSource(generated, "x.js", sourceMap);
			const map = /** @type {NonNullable<ReturnType<typeof src.map>>} */ (
				src.map()
			);
			expect(map.originalScopes).toEqual([originalScope]);
			expect(map.generatedRanges).toBe(generatedRange);
		});

		it("streamChunks emits scope/range callbacks from a SourceMapSource", () => {
			const src = new SourceMapSource(generated, "x.js", sourceMap);
			/** @type {unknown[][]} */
			const scopes = [];
			/** @type {unknown[][]} */
			const ranges = [];
			src.streamChunks(
				{ columns: true, finalSource: true },
				() => {},
				() => {},
				() => {},
				(...args) => scopes.push(args),
				(...args) => ranges.push(args),
			);
			expect(scopes).toHaveLength(2);
			expect(ranges).toHaveLength(2);
			// First scope open: sourceIndex=0, line=1, column=0
			expect(scopes[0].slice(0, 3)).toEqual([0, 1, 0]);
			// First range open: line=1, column=0, flags=1
			expect(ranges[0].slice(0, 3)).toEqual([1, 0, 1]);
		});
	});

	describe("ConcatSource propagates scopes/ranges with line offsets", () => {
		const scopesSer = createOriginalScopesSerializer();
		const scopeA =
			scopesSer(1, 0, 0, 0, -1, undefined) +
			scopesSer(3, 0, -1, -1, -1, undefined);

		const rangesSer = createGeneratedRangesSerializer();
		const rangeA =
			rangesSer(1, 0, 1, [0, 0], undefined, undefined) +
			rangesSer(2, 0, -1, undefined, undefined, undefined);

		const sourceMapA = {
			version: 3,
			file: "a.js",
			sources: ["a.js"],
			sourcesContent: ["const a = 1;\n"],
			names: [],
			mappings: "AAAA;",
			originalScopes: [scopeA],
			generatedRanges: rangeA,
		};

		it("shifts generated range line offsets for the second chunk", () => {
			const a = new SourceMapSource("const a=1;\n", "a.js", sourceMapA);
			const b = new OriginalSource("const b=2;\n", "b.js");
			const concat = new ConcatSource(a, b);

			const map = /** @type {NonNullable<ReturnType<typeof concat.map>>} */ (
				concat.map()
			);
			expect(map.originalScopes).toBeDefined();
			expect(map.generatedRanges).toBeDefined();

			// Decode the resulting generatedRanges and confirm the first range
			// starts at line 1 of the final output (the SourceMapSource came first).
			/** @type {[number, number][]} */
			const starts = [];
			readGeneratedRanges(map.generatedRanges, (line, column, flags) => {
				if (flags >= 0) starts.push([line, column]);
			});
			expect(starts[0]).toEqual([1, 0]);
		});
	});
});
