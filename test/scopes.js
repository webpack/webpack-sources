"use strict";

const CachedSource = require("../lib/CachedSource");
const ConcatSource = require("../lib/ConcatSource");
const OriginalSource = require("../lib/OriginalSource");
const PrefixSource = require("../lib/PrefixSource");
const RawSource = require("../lib/RawSource");
const ReplaceSource = require("../lib/ReplaceSource");
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

		it("uses `.repeat` when the line gap is larger than 1", () => {
			const ser = createGeneratedRangesSerializer();
			const encoded =
				ser(1, 0, 0, undefined, undefined, undefined) +
				ser(4, 0, 0, undefined, undefined, undefined);
			// Three `;` separators between line 1 and line 4.
			expect(encoded.split(";")).toHaveLength(4);
		});

		it("emits `,` for same-line ranges", () => {
			const ser = createGeneratedRangesSerializer();
			const encoded =
				ser(1, 0, 0, undefined, undefined, undefined) +
				ser(1, 5, 0, undefined, undefined, undefined);
			// Same-line entries are comma-separated, not semicolon-separated.
			expect(encoded).not.toContain(";");
			expect(encoded.split(",")).toHaveLength(2);
		});

		it("round-trips a callsite (HAS_CALLSITE_FLAG) with source change", () => {
			const ser = createGeneratedRangesSerializer();
			let encoded = "";
			// Start range with callsite referencing source 1, line 2, column 3.
			// flags = HAS_CALLSITE_FLAG (2).
			encoded += ser(1, 0, 2, undefined, [1, 2, 3], undefined);
			// Second range starts on same line, callsite in a different source
			// — exercises the source-change reset in both serializer and reader.
			encoded += ser(1, 10, 2, undefined, [0, 1, 1], undefined);
			encoded += ser(3, 0, -1, undefined, undefined, undefined);
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
			expect(calls[0]).toEqual([1, 0, 2, undefined, [1, 2, 3], []]);
			expect(calls[1]).toEqual([1, 10, 2, undefined, [0, 1, 1], []]);
			expect(calls[2]).toEqual([3, 0, -1, undefined, undefined, undefined]);
			expect(calls[3]).toEqual([3, 5, -1, undefined, undefined, undefined]);
		});

		it("round-trips simple (no-subrange) bindings", () => {
			const ser = createGeneratedRangesSerializer();
			// Two bindings, each just an expression index (no subranges).
			const bindings = [[1], [3]];
			const encoded =
				ser(1, 0, 0, undefined, undefined, bindings) +
				ser(3, 0, -1, undefined, undefined, undefined);

			/** @type {(number[][] | undefined)[]} */
			const seen = [];
			readGeneratedRanges(encoded, (_l, _c, _f, _d, _cs, b) => {
				seen.push(b && b.map((x) => [...x]));
			});
			expect(seen[0]).toEqual([[1], [3]]);
			expect(seen[1]).toBeUndefined();
		});

		it("preserves subrange line deltas on the wire (not absolute values)", () => {
			// The Scopes Proposal encodes sub-subrange lines as deltas from
			// the previous subrange — the first subrange has an absolute
			// line, subsequent ones carry `lineDelta`. We feed the serializer
			// absolute values and verify the reader surfaces the delta
			// representation after round-trip.
			const ser = createGeneratedRangesSerializer();
			const bindings = [[1, 5, 3, 0, 10, 0, 0]];
			const encoded =
				ser(1, 0, 0, undefined, undefined, bindings) +
				ser(3, 0, -1, undefined, undefined, undefined);
			/** @type {number[][] | undefined} */
			let decoded;
			readGeneratedRanges(encoded, (_l, _c, f, _d, _cs, b) => {
				if (f >= 0) decoded = b && b.map((x) => [...x]);
			});
			// Second subrange's line is a delta (10 - 5 = 5).
			expect(decoded).toEqual([[1, 5, 3, 0, 5, 0, 0]]);
		});

		it("round-trips a definition whose source index changes between ranges", () => {
			// Serializer resets defScope to 0 when defSource changes.
			const ser = createGeneratedRangesSerializer();
			let encoded = "";
			encoded += ser(1, 0, 1, [0, 3], undefined, undefined);
			encoded += ser(2, 0, 1, [1, 7], undefined, undefined);
			encoded += ser(4, 0, -1, undefined, undefined, undefined);
			encoded += ser(4, 5, -1, undefined, undefined, undefined);

			/** @type {([number, number] | undefined)[]} */
			const defs = [];
			readGeneratedRanges(encoded, (_l, _c, f, d) => {
				if (f >= 0) defs.push(d && [d[0], d[1]]);
			});
			expect(defs).toEqual([
				[0, 3],
				[1, 7],
			]);
		});

		it("ignores INVALID chars in generatedRanges input", () => {
			const ser = createGeneratedRangesSerializer();
			let encoded = ser(1, 0, 0, undefined, undefined, undefined);
			// Splice a disallowed char (space, charCode 32, maps to INVALID_BIT).
			encoded = `${encoded[0]} ${encoded.slice(1)}`;
			/** @type {[number, number][]} */
			const starts = [];
			readGeneratedRanges(encoded, (line, column, flags) => {
				if (flags >= 0) starts.push([line, column]);
			});
			expect(starts).toEqual([[1, 0]]);
		});

		it("ignores out-of-table chars (charCode > z) in generatedRanges input", () => {
			const ser = createGeneratedRangesSerializer();
			// Inject a non-ASCII char (charCode > CC_MAX=122) mid-stream.
			const encoded =
				ser(1, 0, 0, undefined, undefined, undefined) +
				String.fromCharCode(200);
			/** @type {[number, number][]} */
			const starts = [];
			readGeneratedRanges(encoded, (line, column, flags) => {
				if (flags >= 0) starts.push([line, column]);
			});
			expect(starts).toEqual([[1, 0]]);
		});

		it("emits the final range-end entry when the input ends without a terminator", () => {
			// Build a string whose last entry is mid-stream (no trailing `,`
			// or `;`). The reader's tail-flush path should still emit it.
			const ser = createGeneratedRangesSerializer();
			const normal =
				ser(1, 0, 1, [0, 0], undefined, undefined) +
				ser(3, 5, -1, undefined, undefined, undefined);
			// The serializer always emits fully-formed entries; to exercise
			// the tail-flush we concatenate without a trailing separator and
			// verify both the start and the end were surfaced.
			/** @type {number[]} */
			const flagsSeen = [];
			readGeneratedRanges(normal, (_l, _c, f) => flagsSeen.push(f));
			expect(flagsSeen).toEqual([1, -1]);
		});
	});

	describe("reader edge cases", () => {
		it("readOriginalScopes is a no-op on non-string input", () => {
			const onScope = jest.fn();
			readOriginalScopes(0, undefined, onScope);
			readOriginalScopes(
				0,
				/** @type {string} */ (/** @type {unknown} */ (null)),
				onScope,
			);
			readOriginalScopes(
				0,
				/** @type {string} */ (/** @type {unknown} */ (42)),
				onScope,
			);
			expect(onScope).not.toHaveBeenCalled();
		});

		it("readGeneratedRanges is a no-op on non-string input", () => {
			const onRange = jest.fn();
			readGeneratedRanges(undefined, onRange);
			readGeneratedRanges(
				/** @type {string} */ (/** @type {unknown} */ (null)),
				onRange,
			);
			expect(onRange).not.toHaveBeenCalled();
		});

		it("readOriginalScopes ignores INVALID and out-of-table chars", () => {
			const ser = createOriginalScopesSerializer();
			const encoded = `${ser(1, 0, 0, 0, -1, undefined) + String.fromCharCode(200)} `;
			/** @type {number[]} */
			const lines = [];
			readOriginalScopes(0, encoded, (_, line) => lines.push(line));
			expect(lines).toEqual([1]);
		});

		it("readOriginalScopes: flag with HAS_NAME_FLAG=0 skips the name field", () => {
			const ser = createOriginalScopesSerializer();
			// flags=0 means no HAS_NAME_FLAG; the reader should jump past
			// the name field and still accept variables.
			const encoded =
				ser(1, 0, 0, 0, -1, [5, 7]) + ser(3, 0, -1, -1, -1, undefined);
			/** @type {[number, number, number[]][]} */
			const calls = [];
			readOriginalScopes(0, encoded, (_si, line, _c, flags, _k, _n, vars) => {
				calls.push([line, flags, [...vars]]);
			});
			expect(calls).toEqual([
				[1, 0, [5, 7]],
				[3, -1, []],
			]);
		});
	});

	describe("PrefixSource forwards scope/range with column offsets", () => {
		const scopesSer = createOriginalScopesSerializer();
		const scopeA =
			scopesSer(1, 0, 0, 0, -1, undefined) +
			scopesSer(3, 0, -1, -1, -1, undefined);
		const rangesSer = createGeneratedRangesSerializer();
		// Range that starts at column 4 — the reader should then observe
		// column (4 + prefix.length) after PrefixSource shifts it.
		const rangeA =
			rangesSer(1, 4, 1, [0, 0], undefined, undefined) +
			rangesSer(2, 0, -1, undefined, undefined, undefined);
		const sourceMap = {
			version: 3,
			file: "a.js",
			sources: ["a.js"],
			sourcesContent: ["const a = 1;\n"],
			names: [],
			mappings: "AAAIA;",
			originalScopes: [scopeA],
			generatedRanges: rangeA,
		};

		it("shifts generated-range columns by the prefix length (non-line-start)", () => {
			const inner = new SourceMapSource("    const a=1;\n", "a.js", sourceMap);
			const prefixed = new PrefixSource("// ", inner);
			const map = /** @type {NonNullable<ReturnType<typeof prefixed.map>>} */ (
				prefixed.map()
			);
			/** @type {[number, number][]} */
			const starts = [];
			readGeneratedRanges(map.generatedRanges, (line, column, flags) => {
				if (flags >= 0) starts.push([line, column]);
			});
			// Inner range column was 4; prefix "// " has length 3; final
			// column should be 7.
			expect(starts[0]).toEqual([1, 7]);
		});

		it("leaves line-start (column 0) ranges at column 0", () => {
			// Make the inner range start at column 0; PrefixSource should
			// keep it at column 0 (the prefix is modeled as a separate
			// unmapped chunk ahead of the range).
			const rangesSer2 = createGeneratedRangesSerializer();
			const rangeZero =
				rangesSer2(1, 0, 1, [0, 0], undefined, undefined) +
				rangesSer2(2, 0, -1, undefined, undefined, undefined);
			const sourceMapZero = {
				...sourceMap,
				mappings: "AAAA;",
				generatedRanges: rangeZero,
			};
			const inner = new SourceMapSource("const a=1;\n", "a.js", sourceMapZero);
			const prefixed = new PrefixSource("// ", inner);
			const map = /** @type {NonNullable<ReturnType<typeof prefixed.map>>} */ (
				prefixed.map()
			);
			/** @type {[number, number][]} */
			const starts = [];
			readGeneratedRanges(map.generatedRanges, (line, column, flags) => {
				if (flags >= 0) starts.push([line, column]);
			});
			expect(starts[0]).toEqual([1, 0]);
		});
	});

	describe("CachedSource propagates scopes on both cache paths", () => {
		const scopesSer = createOriginalScopesSerializer();
		const scope =
			scopesSer(1, 0, 0, 0, -1, undefined) +
			scopesSer(3, 0, -1, -1, -1, undefined);
		const rangesSer = createGeneratedRangesSerializer();
		const range =
			rangesSer(1, 0, 1, [0, 0], undefined, undefined) +
			rangesSer(2, 0, -1, undefined, undefined, undefined);
		const sourceMap = {
			version: 3,
			file: "a.js",
			sources: ["a.js"],
			sourcesContent: ["const a = 1;\n"],
			names: [],
			mappings: "AAAA;",
			originalScopes: [scope],
			generatedRanges: range,
		};

		it("preserves scopes on the cache-miss path (first .map() call)", () => {
			const inner = new SourceMapSource("const a=1;\n", "a.js", sourceMap);
			const cached = new CachedSource(inner);
			const map = /** @type {NonNullable<ReturnType<typeof cached.map>>} */ (
				cached.map()
			);
			expect(map.originalScopes).toBeDefined();
			expect(map.generatedRanges).toBeDefined();
		});

		it("preserves scopes on the cache-hit path (second streamChunks call)", () => {
			const inner = new SourceMapSource("const a=1;\n", "a.js", sourceMap);
			const cached = new CachedSource(inner);
			// Prime the cache. Needs .source() so both _cachedSource and
			// _cachedMaps are populated before the second streamChunks call.
			cached.source();
			cached.map();
			// Second streamChunks — the cache-hit path re-reads from the
			// cached sourceAndMap and must still emit the scope/range data.
			/** @type {unknown[][]} */
			const scopes = [];
			/** @type {unknown[][]} */
			const ranges = [];
			cached.streamChunks(
				{ columns: true, finalSource: true },
				() => {},
				() => {},
				() => {},
				(...args) => scopes.push(args),
				(...args) => ranges.push(args),
			);
			expect(scopes.length).toBeGreaterThan(0);
			expect(ranges.length).toBeGreaterThan(0);
		});
	});

	describe("ReplaceSource forwards original scopes but drops generated ranges", () => {
		const scopesSer = createOriginalScopesSerializer();
		const scope =
			scopesSer(1, 0, 0, 0, -1, undefined) +
			scopesSer(3, 0, -1, -1, -1, undefined);
		const rangesSer = createGeneratedRangesSerializer();
		const range =
			rangesSer(1, 0, 1, [0, 0], undefined, undefined) +
			rangesSer(2, 0, -1, undefined, undefined, undefined);
		const sourceMap = {
			version: 3,
			file: "a.js",
			sources: ["a.js"],
			sourcesContent: ["const a = 1;\n"],
			names: [],
			mappings: "AAAA;",
			originalScopes: [scope],
			generatedRanges: range,
		};

		it("keeps originalScopes but drops generatedRanges in the output map", () => {
			const inner = new SourceMapSource("const a=1;\n", "a.js", sourceMap);
			const replaced = new ReplaceSource(inner);
			replaced.replace(6, 6, "42");
			const map = /** @type {NonNullable<ReturnType<typeof replaced.map>>} */ (
				replaced.map()
			);
			expect(map.originalScopes).toBeDefined();
			expect(map.generatedRanges).toBeUndefined();
		});
	});

	describe("SourceMapSource with inner map drops scopes silently", () => {
		// Combined source maps can't remap scope coordinates yet, so the
		// callbacks should simply not fire. Verify nothing throws and no
		// scope/range data lands on the output map.
		const scopesSer = createOriginalScopesSerializer();
		const scope =
			scopesSer(1, 0, 0, 0, -1, undefined) +
			scopesSer(3, 0, -1, -1, -1, undefined);
		const rangesSer = createGeneratedRangesSerializer();
		const range =
			rangesSer(1, 0, 1, [0, 0], undefined, undefined) +
			rangesSer(2, 0, -1, undefined, undefined, undefined);
		const outerMap = {
			version: 3,
			file: "out.js",
			sources: ["intermediate.js"],
			sourcesContent: ["const a=1;\n"],
			names: [],
			mappings: "AAAA;",
			originalScopes: [scope],
			generatedRanges: range,
		};
		const innerMap = {
			version: 3,
			file: "intermediate.js",
			sources: ["a.js"],
			sourcesContent: ["const a = 1;\n"],
			names: [],
			mappings: "AAAA;",
		};

		it("doesn't throw, doesn't emit, and doesn't retain scope fields", () => {
			const src = new SourceMapSource(
				"const a=1;\n",
				"intermediate.js",
				outerMap,
				"const a = 1;\n",
				innerMap,
			);
			/** @type {unknown[][]} */
			const scopes = [];
			/** @type {unknown[][]} */
			const ranges = [];
			// Directly drive streamChunks so we can observe the callbacks.
			expect(() => {
				src.streamChunks(
					{ columns: true, finalSource: true },
					() => {},
					() => {},
					() => {},
					(...args) => scopes.push(args),
					(...args) => ranges.push(args),
				);
			}).not.toThrow();
			expect(scopes).toHaveLength(0);
			expect(ranges).toHaveLength(0);
			// Because getFromStreamChunks sees no scope/range events, the
			// combined map should have neither field.
			const map = /** @type {NonNullable<ReturnType<typeof src.map>>} */ (
				src.map()
			);
			expect(map.originalScopes).toBeUndefined();
			expect(map.generatedRanges).toBeUndefined();
		});
	});

	describe("leaf sources accept scope callbacks without firing them", () => {
		it("rawSource.streamChunks ignores the scope/range callbacks", () => {
			const src = new RawSource("x\n");
			const scopeFn = jest.fn();
			const rangeFn = jest.fn();
			src.streamChunks(
				{ finalSource: false },
				() => {},
				() => {},
				() => {},
				scopeFn,
				rangeFn,
			);
			expect(scopeFn).not.toHaveBeenCalled();
			expect(rangeFn).not.toHaveBeenCalled();
		});

		it("originalSource.streamChunks ignores the scope/range callbacks", () => {
			const src = new OriginalSource("x\n", "x.js");
			const scopeFn = jest.fn();
			const rangeFn = jest.fn();
			src.streamChunks(
				{ finalSource: false },
				() => {},
				() => {},
				() => {},
				scopeFn,
				rangeFn,
			);
			expect(scopeFn).not.toHaveBeenCalled();
			expect(rangeFn).not.toHaveBeenCalled();
		});
	});

	describe("streamChunks helper forwards scope callbacks for Sources without streamChunks()", () => {
		// `streamChunks(source, options, onChunk, ...)` has a fallback for
		// sources that don't implement `streamChunks()` themselves: it
		// calls `sourceAndMap()` and routes into `streamChunksOfSourceMap`.
		// We trigger that branch by hand-rolling a Source-like whose
		// .sourceAndMap returns a map with originalScopes/generatedRanges.
		const scopesSer = createOriginalScopesSerializer();
		const scope =
			scopesSer(1, 0, 0, 0, -1, undefined) +
			scopesSer(3, 0, -1, -1, -1, undefined);
		const rangesSer = createGeneratedRangesSerializer();
		const range =
			rangesSer(1, 0, 1, [0, 0], undefined, undefined) +
			rangesSer(2, 0, -1, undefined, undefined, undefined);

		it("fallback path emits scopes/ranges into the output map", () => {
			const streamChunks = require("../lib/helpers/streamChunks");

			const sourceLike = {
				sourceAndMap() {
					return {
						source: "const a=1;\n",
						map: {
							version: 3,
							file: "a.js",
							sources: ["a.js"],
							sourcesContent: ["const a = 1;\n"],
							names: [],
							mappings: "AAAA;",
							originalScopes: [scope],
							generatedRanges: range,
						},
					};
				},
			};
			/** @type {unknown[][]} */
			const scopes = [];
			/** @type {unknown[][]} */
			const ranges = [];
			streamChunks(
				/** @type {import("../lib/Source")} */ (
					/** @type {unknown} */ (sourceLike)
				),
				{ columns: true, finalSource: false },
				() => {},
				() => {},
				() => {},
				(...args) => scopes.push(args),
				(...args) => ranges.push(args),
			);
			expect(scopes).toHaveLength(2);
			expect(ranges).toHaveLength(2);
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

		it("remaps scope sourceIndex when a second child contributes a distinct source", () => {
			// Build a second SourceMapSource over source "b.js" that also
			// carries originalScopes. ConcatSource should emit two entries
			// in the final `sources` / `originalScopes` arrays and rewrite
			// the per-child sourceIndex into the global one.
			const rangesSerB = createGeneratedRangesSerializer();
			const rangeB =
				rangesSerB(1, 0, 1, [0, 0], undefined, undefined) +
				rangesSerB(2, 0, -1, undefined, undefined, undefined);
			const scopesSerB = createOriginalScopesSerializer();
			const scopeB =
				scopesSerB(1, 0, 0, 0, -1, undefined) +
				scopesSerB(3, 0, -1, -1, -1, undefined);
			const sourceMapB = {
				version: 3,
				file: "b.js",
				sources: ["b.js"],
				sourcesContent: ["const b = 2;\n"],
				names: [],
				mappings: "AAAA;",
				originalScopes: [scopeB],
				generatedRanges: rangeB,
			};
			const a = new SourceMapSource("const a=1;\n", "a.js", sourceMapA);
			const b = new SourceMapSource("const b=2;\n", "b.js", sourceMapB);
			const concat = new ConcatSource(a, b);
			const map = /** @type {NonNullable<ReturnType<typeof concat.map>>} */ (
				concat.map()
			);
			expect(map.sources).toEqual(["a.js", "b.js"]);
			// Both children supplied a scope string at their local sourceIndex 0;
			// after remapping they should sit at global indices 0 and 1.
			const outScopes = /** @type {string[]} */ (map.originalScopes);
			expect(outScopes).toHaveLength(2);
			expect(outScopes[0]).not.toBe("");
			expect(outScopes[1]).not.toBe("");
			// Both generated ranges have a definition reference to their
			// respective source; after remapping, the second range's
			// definition should point at sourceIndex 1.
			/** @type {[number, [number, number] | undefined][]} */
			const seen = [];
			readGeneratedRanges(map.generatedRanges, (_line, _col, flags, def) => {
				if (flags >= 0) seen.push([flags, def && [def[0], def[1]]]);
			});
			expect(seen).toEqual([
				[1, [0, 0]],
				[1, [1, 0]],
			]);
		});

		it("remaps scope variable name indices to the global name table", () => {
			// Child A contributes name "a" at its local index 0, child B
			// contributes name "b" at its local index 0. After concat, they
			// should sit at global indices 0 and 1, and the scope-variable
			// indices emitted by ConcatSource should reflect that.
			// flags=1 (HAS_NAME_FLAG) so the serializer emits the name.
			const scopesSerA = createOriginalScopesSerializer();
			const scopeAVars =
				scopesSerA(1, 0, 1, 0, 0, [0]) +
				scopesSerA(3, 0, -1, -1, -1, undefined);
			const mapWithNameA = {
				version: 3,
				file: "a.js",
				sources: ["a.js"],
				sourcesContent: ["const a = 1;\n"],
				names: ["a"],
				mappings: "AAAAA;",
				originalScopes: [scopeAVars],
			};
			const scopesSerB = createOriginalScopesSerializer();
			const scopeBVars =
				scopesSerB(1, 0, 1, 0, 0, [0]) +
				scopesSerB(3, 0, -1, -1, -1, undefined);
			const mapWithNameB = {
				version: 3,
				file: "b.js",
				sources: ["b.js"],
				sourcesContent: ["const b = 2;\n"],
				names: ["b"],
				mappings: "AAAAA;",
				originalScopes: [scopeBVars],
			};
			const a = new SourceMapSource("const a=1;\n", "a.js", mapWithNameA);
			const b = new SourceMapSource("const b=2;\n", "b.js", mapWithNameB);
			const concat = new ConcatSource(a, b);
			const map = /** @type {NonNullable<ReturnType<typeof concat.map>>} */ (
				concat.map()
			);
			expect(map.names).toEqual(["a", "b"]);
			// Collect the remapped name index and variable indices per source.
			/** @type {{ name: number, vars: number[] }[]} */
			const seen = [[], []].map(() => ({ name: -1, vars: [] }));
			readAllOriginalScopes(map.originalScopes, (si, _l, _c, f, _k, n, v) => {
				if (f >= 0) {
					seen[si].name = n;
					seen[si].vars.push(...v);
				}
			});
			// Source 0: name "a" → global 0; variable "a" → global 0.
			expect(seen[0]).toEqual({ name: 0, vars: [0] });
			// Source 1: name "b" → global 1; variable "b" → global 1.
			expect(seen[1]).toEqual({ name: 1, vars: [1] });
		});
	});
});
