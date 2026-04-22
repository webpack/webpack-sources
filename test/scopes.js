"use strict";

const ConcatSource = require("../lib/ConcatSource");
const OriginalSource = require("../lib/OriginalSource");
const SourceMapSource = require("../lib/SourceMapSource");
const {
	createGeneratedRangesSerializer,
	createOriginalScopesSerializer,
	readAllOriginalScopes,
	readGeneratedRanges,
	readOriginalScopes,
} = require("../lib/helpers/scopes");

// These tests cover the experimental Source Map Scopes Proposal plumbing.
// See lib/helpers/scopes.js for caveats about API stability.
describe("Source Map Scopes Proposal", () => {
	describe("originalScopes serializer/reader round-trip", () => {
		it("round-trips a nested scope with a named function", () => {
			const ser = createOriginalScopesSerializer();
			// Outer (module) scope — line 1, column 0, kind 0, flags 0
			let encoded = "";
			encoded += ser(1, 0, 0, 0, -1, undefined);
			// Inner (function `foo`) scope — line 2, column 2, kind 1,
			// flags 1 (HAS_NAME), name index 0, variables [1,2]
			encoded += ser(2, 2, 1, 1, 0, [1, 2]);
			encoded += ser(10, 1, -1, -1, -1, undefined); // end inner
			encoded += ser(12, 0, -1, -1, -1, undefined); // end outer

			/** @type {[number, number, number, number, number, number, number[]][]} */
			const calls = [];
			readOriginalScopes(0, encoded, (...args) => {
				// Copy variables: the reader reuses the same array instance.
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

		it("encoder single-sextet fast path round-trips through the reader", () => {
			// All values here fit in a single VLQ sextet (|value| <= 15),
			// exercising the fast path in valueAsToken.
			const ser = createOriginalScopesSerializer();
			let encoded = "";
			for (const line of [1, 3, 7, 12]) {
				encoded += ser(line, line - 1, 0, 0, -1, undefined);
			}
			/** @type {number[]} */
			const lines = [];
			readOriginalScopes(0, encoded, (_, line) => lines.push(line));
			expect(lines).toEqual([1, 3, 7, 12]);
		});

		it("encoder multi-sextet fallback round-trips through the reader", () => {
			// Values above the single-sextet range (|value| > 15), plus some
			// much larger values, to exercise the continuation loop.
			const ser = createOriginalScopesSerializer();
			let encoded = "";
			encoded += ser(1, 0, 0, 0, -1, undefined);
			encoded += ser(100, 500, 0, 0, -1, undefined);
			encoded += ser(1000000, 2000000, 0, 0, -1, undefined);
			/** @type {[number, number][]} */
			const linesCols = [];
			readOriginalScopes(0, encoded, (_, line, column) =>
				linesCols.push([line, column]),
			);
			expect(linesCols).toEqual([
				[1, 0],
				[100, 500],
				[1000000, 2000000],
			]);
		});
	});

	describe("generatedRanges serializer/reader round-trip", () => {
		it("round-trips ranges with a definition reference", () => {
			const ser = createGeneratedRangesSerializer();
			let encoded = "";
			// Range start at line 1, column 0, flags=1 (HAS_DEFINITION),
			// definition=[0,0]
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

		it("uses a single `;` on a one-line gap (no `.repeat` call)", () => {
			const ser = createGeneratedRangesSerializer();
			// Two ranges whose starts sit on consecutive lines.
			const encoded =
				ser(1, 0, 0, undefined, undefined, undefined) +
				ser(2, 0, 0, undefined, undefined, undefined);
			// The only `;` in the encoded string should be the single separator
			// between the two lines.
			expect(encoded.split(";")).toHaveLength(2);
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

	describe("SourceMapSource preserves originalScopes/generatedRanges", () => {
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
			// starts at line 1 of the final output (SourceMapSource came first).
			/** @type {[number, number][]} */
			const starts = [];
			readGeneratedRanges(map.generatedRanges, (line, column, flags) => {
				if (flags >= 0) starts.push([line, column]);
			});
			expect(starts[0]).toEqual([1, 0]);
		});
	});
});
