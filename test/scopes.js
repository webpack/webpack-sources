"use strict";

const {
	CachedSource,
	ConcatSource,
	OriginalSource,
	ReplaceSource,
} = require("../");
const { collectSourceScopes, encodeScopes } = require("../lib/helpers/scopes");

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
		expect(map.scopes).toBeUndefined();
	});

	it("emits nothing when no source declares a binding", () => {
		const map = mapOf(sourceWithBindings("lib.js"), {
			columns: true,
			scopes: true,
		});
		expect(map.scopes).toBeUndefined();
	});

	it("names each binding and the expression it reads", () => {
		const map = mapOf(sourceWithBindings("lib.js", BINDINGS), {
			columns: true,
			scopes: true,
		});
		expect(typeof map.scopes).toBe("string");
		expect(map.names).toContain("mutable");
		expect(map.names).toContain("ns.mutable");
		expect(map.names).toContain("fn");
		expect(map.names).toContain("ns.fn");
	});

	it("carries bindings through ConcatSource and ReplaceSource", () => {
		const replaced = new ReplaceSource(sourceWithBindings("lib.js", BINDINGS));
		replaced.replace(0, 4, "let");
		const map = mapOf(
			new ConcatSource(new OriginalSource("x();\n", "entry.js"), replaced),
			{ columns: true, scopes: true },
		);
		expect(typeof map.scopes).toBe("string");
		expect(map.names).toContain("ns.mutable");
	});

	it("keeps the map's own names ahead of the ones it adds", () => {
		const map = mapOf(
			new ConcatSource(
				new OriginalSource("x();\n", "entry.js"),
				sourceWithBindings("lib.js", BINDINGS),
			),
			{ columns: true, scopes: true },
		);
		expect(map.names.indexOf("mutable")).toBeGreaterThanOrEqual(0);
		expect(new Set(map.names).size).toBe(map.names.length);
	});

	it("reports the same field through sourceAndMap", () => {
		const source = new ConcatSource(sourceWithBindings("lib.js", BINDINGS));
		const options = { columns: true, scopes: true };
		expect(
			/** @type {RawSourceMap} */ (source.sourceAndMap(options).map).scopes,
		).toBe(mapOf(source, options).scopes);
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
			expect(mapOf(source, { columns: true }).scopes).toBeUndefined();
			expect(
				mapOf(source, { columns: true, scopes: true }).scopes,
			).toBeDefined();
		});

		it("does not leak scopes into a request that did not ask", () => {
			const source = cached();
			expect(
				mapOf(source, { columns: true, scopes: true }).scopes,
			).toBeDefined();
			expect(mapOf(source, { columns: true }).scopes).toBeUndefined();
		});

		it("still reports bindings once the source has been streamed", () => {
			const module = new CachedSource(sourceWithBindings("lib.js", BINDINGS));
			module.map({ columns: true });
			module.source();
			const map = mapOf(
				new ConcatSource(new OriginalSource("x();\n", "entry.js"), module),
				{ columns: true, scopes: true },
			);
			expect(map.names).toContain("ns.mutable");
		});
	});

	describe("encoding", () => {
		it("reads back the runs a finished map describes", () => {
			const map = mapOf(sourceWithBindings("lib.js", BINDINGS), {
				columns: true,
			});
			const scopes = collectSourceScopes(map.mappings, map.sources.length);
			expect(scopes).toHaveLength(1);
			expect(scopes[0].sourceIndex).toBe(0);
			expect(scopes[0].rangeStarts).toHaveLength(scopes[0].rangeEnds.length);
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
			expect(encodeScopes(scopes, map.sources.length, names)).toBe(
				streamed.scopes,
			);
		});
	});
});
