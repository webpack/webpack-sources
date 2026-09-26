"use strict";

const assert = require("assert");
const { describe, it } = require("node:test");
const {
	CachedSource,
	ConcatSource,
	OriginalSource,
	ReplaceSource,
} = require("../");
const {
	addScopesToSourceMap,
	collectSourceScopes,
	createScopeCollector,
	encodeScopes,
} = require("../lib/helpers/scopes");

/** @typedef {import("../lib/Source").MapOptions} MapOptions */
/** @typedef {import("../lib/Source").RawSourceMap} RawSourceMap */
/** @typedef {import("../lib/helpers/streamChunks").ScopeBindings} ScopeBindings */

/**
 * @param {{ map: (options?: MapOptions) => RawSourceMap | null }} source source
 * @param {MapOptions} options map options
 * @returns {RawSourceMap} the map, which every case here produces
 */
const mapOf = (source, options) =>
	/** @type {RawSourceMap} */ (source.map(options));

/**
 * @param {string} name source name
 * @param {ScopeBindings=} bindings bindings the source declares
 * @returns {OriginalSource} source
 */
const sourceWithBindings = (name, bindings) =>
	new OriginalSource("const a = mutable;\nfn();\n", name, bindings);

const BINDINGS = new Map([
	["mutable", "ns.mutable"],
	["fn", "ns.fn"],
]);

describe("scopes", () => {
	it("emits nothing without the option", () => {
		const map = mapOf(sourceWithBindings("lib.js", BINDINGS), {
			columns: true,
		});
		assert.strictEqual(map.scopes, undefined);
	});

	it("emits nothing when no source declares a binding", () => {
		const map = mapOf(sourceWithBindings("lib.js"), {
			columns: true,
			scopes: true,
		});
		assert.strictEqual(map.scopes, undefined);
	});

	it("names each binding and the expression it reads", () => {
		const map = mapOf(sourceWithBindings("lib.js", BINDINGS), {
			columns: true,
			scopes: true,
		});
		assert.strictEqual(typeof map.scopes, "string");
		assert.ok(map.names.includes("mutable"));
		assert.ok(map.names.includes("ns.mutable"));
		assert.ok(map.names.includes("fn"));
		assert.ok(map.names.includes("ns.fn"));
	});

	it("carries bindings through ConcatSource and ReplaceSource", () => {
		const replaced = new ReplaceSource(sourceWithBindings("lib.js", BINDINGS));
		replaced.replace(0, 4, "let");
		const map = mapOf(
			new ConcatSource(new OriginalSource("x();\n", "entry.js"), replaced),
			{ columns: true, scopes: true },
		);
		assert.strictEqual(typeof map.scopes, "string");
		assert.ok(map.names.includes("ns.mutable"));
	});

	it("keeps the map's own names ahead of the ones it adds", () => {
		const map = mapOf(
			new ConcatSource(
				new OriginalSource("x();\n", "entry.js"),
				sourceWithBindings("lib.js", BINDINGS),
			),
			{ columns: true, scopes: true },
		);
		assert.ok(map.names.includes("mutable"));
		assert.strictEqual(new Set(map.names).size, map.names.length);
	});

	it("reports the same field through sourceAndMap", () => {
		const source = new ConcatSource(sourceWithBindings("lib.js", BINDINGS));
		const options = { columns: true, scopes: true };
		assert.strictEqual(
			/** @type {RawSourceMap} */ (source.sourceAndMap(options).map).scopes,
			mapOf(source, options).scopes,
		);
	});

	it("exposes the helpers on the public util export", () => {
		const { util } = require("../");

		assert.strictEqual(util.scopes.addScopesToSourceMap, addScopesToSourceMap);
		assert.strictEqual(util.scopes.collectSourceScopes, collectSourceScopes);
		assert.strictEqual(util.scopes.encodeScopes, encodeScopes);
	});

	describe("cachedSource", () => {
		/**
		 * @returns {CachedSource} a cached source over one module with bindings
		 */
		const cached = () =>
			new CachedSource(
				new ConcatSource(sourceWithBindings("lib.js", BINDINGS)),
			);

		it("does not serve a scopes-less cached map to a scopes request", () => {
			const source = cached();
			assert.strictEqual(mapOf(source, { columns: true }).scopes, undefined);
			assert.notStrictEqual(
				mapOf(source, { columns: true, scopes: true }).scopes,
				undefined,
			);
		});

		it("does not leak scopes into a request that did not ask", () => {
			const source = cached();
			assert.notStrictEqual(
				mapOf(source, { columns: true, scopes: true }).scopes,
				undefined,
			);
			assert.strictEqual(mapOf(source, { columns: true }).scopes, undefined);
		});

		it("still reports bindings once the source has been streamed", () => {
			const module = new CachedSource(sourceWithBindings("lib.js", BINDINGS));
			module.map({ columns: true });
			module.source();
			const map = mapOf(
				new ConcatSource(new OriginalSource("x();\n", "entry.js"), module),
				{ columns: true, scopes: true },
			);
			assert.ok(map.names.includes("ns.mutable"));
		});

		/**
		 * @returns {{ module: CachedSource, streams: () => number }} a cached module and how often its original was streamed
		 */
		const countedModule = () => {
			const original = sourceWithBindings("lib.js", BINDINGS);
			const { streamChunks } = original;
			let streams = 0;
			original.streamChunks = (...args) => {
				streams++;
				return streamChunks.apply(original, args);
			};
			return {
				module: new CachedSource(original),
				streams: () => streams,
			};
		};

		/**
		 * @param {CachedSource} module module
		 * @returns {ConcatSource} a bundle composing the module
		 */
		const bundleOf = (module) =>
			new ConcatSource(new OriginalSource("x();\n", "entry.js"), module);

		it("keeps the bindings when a composed map is built again", () => {
			const { module, streams } = countedModule();
			const options = { columns: true, scopes: true };
			const first = mapOf(bundleOf(module), options);
			assert.notStrictEqual(first.scopes, undefined);
			assert.strictEqual(streams(), 1);

			// The module now replays its cached map instead of streaming again.
			assert.strictEqual(mapOf(bundleOf(module), options).scopes, first.scopes);
			assert.strictEqual(streams(), 1);

			// sourceAndMap asks the module for its source too, a separate cache
			// entry: filled by one stream, then replayed as well.
			for (let i = 0; i < 2; i++) {
				assert.strictEqual(
					/** @type {RawSourceMap} */
					(bundleOf(module).sourceAndMap(options).map).scopes,
					first.scopes,
				);
				assert.strictEqual(streams(), 2);
			}
		});

		it("streams once to record bindings a map() call did not see", () => {
			const { module, streams } = countedModule();
			const options = { columns: true, scopes: true };
			// map() fills the entry for these options without seeing bindings
			assert.notStrictEqual(mapOf(module, options).scopes, undefined);
			const afterMap = streams();

			/** @type {(ScopeBindings | undefined)[]} */
			const reported = [];
			/**
			 * @returns {void}
			 */
			const stream = () => {
				reported.length = 0;
				module.streamChunks(
					options,
					() => {},
					(sourceIndex, _source, _content, bindings) => {
						reported[sourceIndex] = bindings;
					},
					() => {},
				);
			};
			stream();
			assert.strictEqual(reported[0], BINDINGS);
			assert.strictEqual(streams(), afterMap + 1);
			stream();
			assert.strictEqual(reported[0], BINDINGS);
			assert.strictEqual(streams(), afterMap + 1);
		});

		it("keeps the bindings in the data a restored source is built from", () => {
			const { module } = countedModule();
			const options = { columns: true, scopes: true };
			const first = mapOf(bundleOf(module), options);
			module.source();

			// A persistently cached module is restored from its data alone.
			const restored = new CachedSource(() => {
				throw new Error("the original must not be needed");
			}, module.getCachedData());
			assert.strictEqual(
				mapOf(bundleOf(restored), options).scopes,
				first.scopes,
			);
		});

		it("adds nothing to the data when no request asked for scopes", () => {
			const { module } = countedModule();
			mapOf(bundleOf(module), { columns: true });
			module.source();
			for (const entry of module.getCachedData().maps.values()) {
				assert.ok(!("scopeBindings" in entry));
			}
		});

		it("records no bindings for a request without the option", () => {
			const { module, streams } = countedModule();
			assert.strictEqual(
				mapOf(bundleOf(module), { columns: true }).scopes,
				undefined,
			);
			assert.strictEqual(
				mapOf(bundleOf(module), { columns: true }).scopes,
				undefined,
			);
			assert.strictEqual(streams(), 1);
		});
	});

	describe("encoding", () => {
		it("reads back the runs a finished map describes", () => {
			const map = mapOf(sourceWithBindings("lib.js", BINDINGS), {
				columns: true,
			});
			const scopes = collectSourceScopes(map.mappings, map.sources.length);
			assert.strictEqual(scopes.length, 1);
			assert.strictEqual(scopes[0].sourceIndex, 0);
			assert.strictEqual(
				scopes[0].rangeStarts.length,
				scopes[0].rangeEnds.length,
			);
		});

		it("agrees with the field built while the map was written", () => {
			const source = sourceWithBindings("lib.js", BINDINGS);
			const streamed = mapOf(source, { columns: true, scopes: true });
			const map = mapOf(source, { columns: true });
			const scopes = collectSourceScopes(map.mappings, map.sources.length);
			for (const scope of scopes) {
				for (const [name, value] of BINDINGS) {
					scope.variables.push(name);
					scope.values.push(value);
				}
			}
			const names = [...map.names];
			assert.strictEqual(
				encodeScopes(scopes, map.sources.length, names),
				streamed.scopes,
			);
		});

		it("closes the last range where output without a trailing newline ends", () => {
			// "x();" and "a;" share one generated line: lib.js's range starts at
			// column 4 and has to end at column 6, not at column 0 before it.
			const source = new ConcatSource(
				new OriginalSource("x();", "entry.js"),
				new OriginalSource("a;", "lib.js", BINDINGS),
			);
			const options = { columns: true, scopes: true };
			const map = mapOf(source, options);

			const collector = createScopeCollector();
			collector.add(0, 0, 0, 0);
			collector.add(0, 4, 1, 0);
			const scopes = collector.finish(0, 6);
			assert.deepStrictEqual(scopes[1].rangeStarts, [{ line: 0, column: 4 }]);
			assert.deepStrictEqual(scopes[1].rangeEnds, [{ line: 0, column: 6 }]);
			for (const [name, value] of BINDINGS) {
				scopes[1].variables.push(name);
				scopes[1].values.push(value);
			}
			const names = [...mapOf(source, { columns: true }).names];
			assert.strictEqual(
				encodeScopes(scopes, map.sources.length, names),
				map.scopes,
			);
			assert.strictEqual(
				/** @type {RawSourceMap} */ (source.sourceAndMap(options).map).scopes,
				map.scopes,
			);
		});
	});

	describe("addScopesToSourceMap", () => {
		/**
		 * @param {string} mappings mappings field
		 * @param {string[]=} sources sources field
		 * @returns {RawSourceMap} a map shaped like one another tool produced
		 */
		const mapOf_ = (mappings, sources = ["lib.js"]) => ({
			version: 3,
			file: "x",
			sources,
			names: [],
			mappings,
		});

		it("does nothing when the map has no mappings", () => {
			const map = mapOf_("");
			addScopesToSourceMap(map, () => BINDINGS);
			assert.strictEqual(map.scopes, undefined);
		});

		it("does nothing when no source is asked for bindings", () => {
			const map = mapOf_("AAAA");
			addScopesToSourceMap(map, () => undefined);
			assert.strictEqual(map.scopes, undefined);
		});

		it("does nothing when a source reports an empty set", () => {
			const map = mapOf_("AAAA");
			addScopesToSourceMap(map, () => new Map());
			assert.strictEqual(map.scopes, undefined);
		});

		it("names the bindings a finished map's source declares", () => {
			const map = mapOf_("AAAA,IAAI");
			addScopesToSourceMap(map, () => BINDINGS);
			assert.strictEqual(typeof map.scopes, "string");
			assert.ok(map.names.includes("mutable"));
			assert.ok(map.names.includes("ns.mutable"));
		});

		it("skips a segment that names no source", () => {
			// the second segment carries only a column delta, so it maps nowhere
			const map = mapOf_("AAAA,C");
			addScopesToSourceMap(map, () => BINDINGS);
			assert.strictEqual(typeof map.scopes, "string");
		});

		it("skips a segment whose source index the map does not have", () => {
			// the second segment steps sourceIndex to 1, past the single source
			const map = mapOf_("AAAA,ACAA");
			addScopesToSourceMap(map, () => BINDINGS);
			assert.strictEqual(typeof map.scopes, "string");
		});

		it("reaches the furthest original line a source explains", () => {
			// one source, interrupted and resumed, so its end has to be extended
			const map = mapOf_("AAAA;ACAA;ADEA", ["lib.js", "other.js"]);
			addScopesToSourceMap(map, (i) => (i === 0 ? BINDINGS : undefined));
			const scopes = collectSourceScopes(map.mappings, 2);
			assert.ok(scopes[0].originalEnd.line > 1);
		});

		it("reuses a name the map already carries", () => {
			const map = mapOf_("AAAA");
			map.names = ["mutable", "mutable"];
			addScopesToSourceMap(map, () => new Map([["mutable", "ns.mutable"]]));
			assert.strictEqual(map.names.filter((n) => n === "mutable").length, 2);
			assert.ok(map.names.includes("ns.mutable"));
		});

		it("encodes a value too large for one digit", () => {
			// forty lines puts the scope's end past what one base64 digit holds
			const map = mapOf_(Array.from({ length: 40 }, () => "AACA").join(";"));
			addScopesToSourceMap(map, () => BINDINGS);
			assert.strictEqual(typeof map.scopes, "string");
			assert.ok(/** @type {string} */ (map.scopes).length > 10);
		});

		it("orders the generated ranges it emits", () => {
			const map = mapOf_("AAAA,IAAI;AAAA,IAAI;AAAA,IAAI");
			addScopesToSourceMap(map, () => BINDINGS);
			assert.strictEqual(typeof map.scopes, "string");
		});
	});
});
