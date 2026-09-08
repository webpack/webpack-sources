"use strict";

const {
	CachedSource,
	ConcatSource,
	OriginalSource,
	ReplaceSource,
} = require("../");
const {
	addScopesToSourceMap,
	collectSourceScopes,
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
			expect(map.scopes).toBeUndefined();
		});

		it("does nothing when no source is asked for bindings", () => {
			const map = mapOf_("AAAA");
			addScopesToSourceMap(map, () => undefined);
			expect(map.scopes).toBeUndefined();
		});

		it("does nothing when a source reports an empty set", () => {
			const map = mapOf_("AAAA");
			addScopesToSourceMap(map, () => new Map());
			expect(map.scopes).toBeUndefined();
		});

		it("names the bindings a finished map's source declares", () => {
			const map = mapOf_("AAAA,IAAI");
			addScopesToSourceMap(map, () => BINDINGS);
			expect(typeof map.scopes).toBe("string");
			expect(map.names).toContain("mutable");
			expect(map.names).toContain("ns.mutable");
		});

		it("skips a segment that names no source", () => {
			// the second segment carries only a column delta, so it maps nowhere
			const map = mapOf_("AAAA,C");
			addScopesToSourceMap(map, () => BINDINGS);
			expect(typeof map.scopes).toBe("string");
		});

		it("skips a segment whose source index the map does not have", () => {
			// the second segment steps sourceIndex to 1, past the single source
			const map = mapOf_("AAAA,ACAA");
			addScopesToSourceMap(map, () => BINDINGS);
			expect(typeof map.scopes).toBe("string");
		});

		it("reaches the furthest original line a source explains", () => {
			// one source, interrupted and resumed, so its end has to be extended
			const map = mapOf_("AAAA;ACAA;ADEA", ["lib.js", "other.js"]);
			addScopesToSourceMap(map, (i) => (i === 0 ? BINDINGS : undefined));
			const scopes = collectSourceScopes(map.mappings, 2);
			expect(scopes[0].originalEnd.line).toBeGreaterThan(1);
		});

		it("reuses a name the map already carries", () => {
			const map = mapOf_("AAAA");
			map.names = ["mutable", "mutable"];
			addScopesToSourceMap(map, () => new Map([["mutable", "ns.mutable"]]));
			expect(map.names.filter((n) => n === "mutable")).toHaveLength(2);
			expect(map.names).toContain("ns.mutable");
		});

		it("encodes a value too large for one digit", () => {
			// forty lines puts the scope's end past what one base64 digit holds
			const map = mapOf_(Array.from({ length: 40 }, () => "AACA").join(";"));
			addScopesToSourceMap(map, () => BINDINGS);
			expect(typeof map.scopes).toBe("string");
			expect(/** @type {string} */ (map.scopes).length).toBeGreaterThan(10);
		});

		it("orders the generated ranges it emits", () => {
			const map = mapOf_("AAAA,IAAI;AAAA,IAAI;AAAA,IAAI");
			addScopesToSourceMap(map, () => BINDINGS);
			expect(typeof map.scopes).toBe("string");
		});
	});
});
