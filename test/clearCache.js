"use strict";

const crypto = require("crypto");

const {
	CachedSource,
	CompatSource,
	ConcatSource,
	OriginalSource,
	PrefixSource,
	RawSource,
	ReplaceSource,
	Source,
	SourceMapSource,
} = require("../");

class TrackedSource extends Source {
	constructor(inner) {
		super();
		this._inner = inner;
		this.calls = {
			source: 0,
			buffer: 0,
			map: 0,
			sourceAndMap: 0,
			clearCache: 0,
		};
	}

	source() {
		this.calls.source++;
		return this._inner.source();
	}

	buffer() {
		this.calls.buffer++;
		return this._inner.buffer();
	}

	size() {
		return this._inner.size();
	}

	map(options) {
		this.calls.map++;
		return this._inner.map(options);
	}

	sourceAndMap(options) {
		this.calls.sourceAndMap++;
		return this._inner.sourceAndMap(options);
	}

	updateHash(hash) {
		this._inner.updateHash(hash);
	}

	clearCache(options, visited) {
		this.calls.clearCache++;
		this._inner.clearCache(options, visited);
	}
}

describe("clearCache", () => {
	it("source.prototype.clearCache is a no-op on the base class", () => {
		class Dummy extends Source {
			source() {
				return "x";
			}
		}
		const dummy = new Dummy();
		expect(() => {
			dummy.clearCache();
		}).not.toThrow();
	});

	it("cachedSource drops cached maps and source entries", () => {
		const inner = new TrackedSource(
			new OriginalSource("TestTestTest", "file.js"),
		);
		const cached = new CachedSource(inner);

		expect(cached.source()).toBe("TestTestTest");
		expect(typeof cached.map()).toBe("object");
		expect(typeof cached.map({ columns: false })).toBe("object");
		expect(inner.calls.source).toBe(1);
		expect(inner.calls.map).toBe(2);

		cached.clearCache();
		expect(inner.calls.clearCache).toBe(1);

		// After clearCache, queries go back to the wrapped source.
		expect(cached.source()).toBe("TestTestTest");
		expect(typeof cached.map()).toBe("object");
		expect(typeof cached.map({ columns: false })).toBe("object");
		expect(inner.calls.source).toBe(2);
		expect(inner.calls.map).toBe(4);
	});

	it("cachedSource does not invoke a lazy `_source` when cleared", () => {
		let lazyCalls = 0;
		const lazy = () => {
			lazyCalls++;
			return new OriginalSource("Lazy", "lazy.js");
		};
		const cached = new CachedSource(lazy);

		cached.clearCache();
		expect(lazyCalls).toBe(0);
		expect(cached.source()).toBe("Lazy");
		expect(lazyCalls).toBe(1);
	});

	it("cachedSource clearCache preserves source contract", () => {
		const cached = new CachedSource(
			new OriginalSource("Hello World", "file.js"),
		);
		expect(cached.size()).toBe(11);
		expect(cached.source()).toBe("Hello World");
		expect(cached.buffer().toString("utf8")).toBe("Hello World");
		cached.clearCache();
		expect(cached.size()).toBe(11);
		expect(cached.source()).toBe("Hello World");
		expect(cached.buffer().toString("utf8")).toBe("Hello World");
	});

	it("concatSource recursively clears children", () => {
		const a = new TrackedSource(new OriginalSource("A", "a.js"));
		const b = new TrackedSource(new OriginalSource("B", "b.js"));
		const concat = new ConcatSource(a, "literal-string", b);

		concat.clearCache();
		expect(a.calls.clearCache).toBe(1);
		expect(b.calls.clearCache).toBe(1);
	});

	it("prefixSource recursively clears the inner source", () => {
		const inner = new TrackedSource(new OriginalSource("body", "f.js"));
		const prefixed = new PrefixSource("> ", inner);
		prefixed.clearCache();
		expect(inner.calls.clearCache).toBe(1);
	});

	it("replaceSource recursively clears the inner source", () => {
		const inner = new TrackedSource(new OriginalSource("body", "f.js"));
		const replaced = new ReplaceSource(inner);
		replaced.clearCache();
		expect(inner.calls.clearCache).toBe(1);
	});

	it("compatSource forwards clearCache when the source-like supports it", () => {
		let clearCalled = 0;
		const sourceLike = {
			source: () => "x",
			clearCache() {
				clearCalled++;
			},
		};
		const compat = new CompatSource(sourceLike);
		compat.clearCache();
		expect(clearCalled).toBe(1);
	});

	it("compatSource silently ignores source-likes without clearCache", () => {
		const sourceLike = { source: () => "x" };
		const compat = new CompatSource(sourceLike);
		expect(() => {
			compat.clearCache();
		}).not.toThrow();
	});

	it("rawSource drops the secondary buffer cache when constructed from a string", () => {
		const raw = new RawSource("hello");
		// Materialise the buffer form, then clear.
		raw.buffer();
		const internal = /** @type {{ _valueAsBuffer?: Buffer }} */ (
			/** @type {unknown} */ (raw)
		);
		expect(internal._valueAsBuffer).toBeDefined();
		raw.clearCache();
		expect(internal._valueAsBuffer).toBeUndefined();
		// Data is preserved via the primary string form.
		expect(raw.source()).toBe("hello");
		expect(raw.buffer().toString("utf8")).toBe("hello");
	});

	it("rawSource keeps the primary buffer when constructed from a Buffer", () => {
		const raw = new RawSource(Buffer.from("hello", "utf8"));
		raw.source();
		raw.clearCache();
		expect(raw.buffer().toString("utf8")).toBe("hello");
	});

	it("originalSource drops the cached string when constructed from a Buffer", () => {
		const orig = new OriginalSource(Buffer.from("hello", "utf8"), "f.js");
		// Cause the string form to be cached.
		orig.source();
		orig.clearCache();
		expect(orig.source()).toBe("hello");
		expect(orig.buffer().toString("utf8")).toBe("hello");
	});

	it("sourceMapSource drops redundant string/buffer duplicates", () => {
		const sm = {
			version: 3,
			sources: ["a.js"],
			names: [],
			mappings: "AAAA",
			file: "out.js",
		};
		const innerMap = {
			version: 3,
			sources: ["a-original.ts"],
			names: [],
			mappings: "AAAA",
			file: "a.js",
		};
		// Pass every optional parameter so all four dual-cached pairs are
		// populated by getArgsAsBuffers(), exercising each branch of
		// SourceMapSource.clearCache().
		const source = new SourceMapSource(
			"hello\n",
			"out.js",
			sm,
			"original\n",
			innerMap,
		);
		// Force buffer AND string materialisation for value, source map,
		// original source, and inner source map via the public API.
		source.getArgsAsBuffers();
		source.source();
		source.map();
		source.clearCache();
		// All inputs still readable after clear.
		expect(source.source()).toBe("hello\n");
		const map = /** @type {{ mappings: string }} */ (source.map());
		expect(map.mappings).toBe("AAAA");
		// Round-trip the buffers once more to confirm internal state stays
		// consistent after clearCache.
		const [valueBuf, name, smBuf, origBuf, innerBuf] =
			source.getArgsAsBuffers();
		expect(valueBuf.toString("utf8")).toBe("hello\n");
		expect(name).toBe("out.js");
		expect(JSON.parse(smBuf.toString("utf8")).mappings).toBe("AAAA");
		expect(/** @type {Buffer} */ (origBuf).toString("utf8")).toBe("original\n");
		expect(
			JSON.parse(/** @type {Buffer} */ (innerBuf).toString("utf8")).file,
		).toBe("a.js");
	});

	it("a shared subtree is walked once when a `visited` WeakSet is passed", () => {
		// Two top-level CachedSources both wrap the SAME inner module
		// (this is the webpack "shared module across chunks" shape).
		const sharedInner = new TrackedSource(
			new OriginalSource("module body", "shared.js"),
		);
		const sharedCached = new CachedSource(sharedInner);
		const top1 = new CachedSource(new ConcatSource(sharedCached));
		const top2 = new CachedSource(new ConcatSource(sharedCached));

		const visited = new WeakSet();
		top1.clearCache(undefined, visited);
		top2.clearCache(undefined, visited);

		// The shared module's clearCache must run exactly once, not twice.
		expect(sharedInner.calls.clearCache).toBe(1);
	});

	it("without a shared `visited` set, each top-level call re-walks the shared subtree", () => {
		// Negative control for the test above: confirms the dedup is doing
		// work, rather than the recursion being broken in some other way.
		const sharedInner = new TrackedSource(
			new OriginalSource("module body", "shared.js"),
		);
		const sharedCached = new CachedSource(sharedInner);
		const top1 = new CachedSource(new ConcatSource(sharedCached));
		const top2 = new CachedSource(new ConcatSource(sharedCached));

		top1.clearCache();
		top2.clearCache();

		expect(sharedInner.calls.clearCache).toBe(2);
	});

	it("`{ maps: true, source: false }` keeps the cached source string", () => {
		const inner = new TrackedSource(new OriginalSource("body", "f.js"));
		const cached = new CachedSource(inner);

		cached.source();
		cached.map();
		const sourceCallsBefore = inner.calls.source;

		cached.clearCache({ maps: true, source: false });

		// source() served from cache (no new call to inner).
		expect(cached.source()).toBe("body");
		expect(inner.calls.source).toBe(sourceCallsBefore);
		// map() re-walks inner because the map cache was dropped.
		const mapCallsBefore = inner.calls.map;
		cached.map();
		expect(inner.calls.map).toBe(mapCallsBefore + 1);
	});

	it("default clearCache preserves the cached hash payload", () => {
		const inner = new OriginalSource("body", "f.js");
		const cached = new CachedSource(inner);
		cached.updateHash(crypto.createHash("md5"));
		const internal = /** @type {{ _cachedHashUpdate?: unknown[] }} */ (
			/** @type {unknown} */ (cached)
		);
		const before = internal._cachedHashUpdate;
		expect(before).toBeDefined();
		cached.clearCache();
		expect(internal._cachedHashUpdate).toBe(before);
	});

	it("default clearCache keeps the cached byte size", () => {
		const cached = new CachedSource(new OriginalSource("hello", "f.js"));
		cached.size();
		const internal = /** @type {{ _cachedSize?: number }} */ (
			/** @type {unknown} */ (cached)
		);
		expect(internal._cachedSize).toBe(5);
		cached.clearCache();
		expect(internal._cachedSize).toBe(5);
	});

	it("cachedSource reuses the `_cachedMaps` Map instead of reallocating", () => {
		const cached = new CachedSource(new OriginalSource("body", "f.js"));
		cached.map();
		const internal = /** @type {{ _cachedMaps: Map<string, unknown> }} */ (
			/** @type {unknown} */ (cached)
		);
		const before = internal._cachedMaps;
		cached.clearCache();
		expect(internal._cachedMaps).toBe(before);
		expect(internal._cachedMaps.size).toBe(0);
	});

	it("`{ parsedMap: true }` drops the parsed object form when a buffer survives", () => {
		const sm = {
			version: 3,
			sources: ["a.js"],
			names: [],
			mappings: "AAAA",
			file: "out.js",
		};
		const source = new SourceMapSource("hello\n", "out.js", sm);
		// Materialise the buffer form so the parsed object is safely droppable.
		source.getArgsAsBuffers();
		const internal =
			/** @type {{ _sourceMapAsObject?: { mappings: string }, _sourceMapAsBuffer?: Buffer }} */ (
				/** @type {unknown} */ (source)
			);
		expect(internal._sourceMapAsObject).toBeDefined();
		expect(internal._sourceMapAsBuffer).toBeDefined();
		source.clearCache({ parsedMap: true });
		expect(internal._sourceMapAsObject).toBeUndefined();
		// map() rehydrates from the buffer — value preserved.
		const map = /** @type {{ mappings: string }} */ (source.map());
		expect(map.mappings).toBe("AAAA");
	});

	it("`parsedMap` defaults to false — parsed object form is kept on default clearCache", () => {
		const sm = {
			version: 3,
			sources: ["a.js"],
			names: [],
			mappings: "AAAA",
			file: "out.js",
		};
		const source = new SourceMapSource("hello\n", "out.js", sm);
		source.getArgsAsBuffers();
		const internal =
			/** @type {{ _sourceMapAsObject?: { mappings: string } }} */ (
				/** @type {unknown} */ (source)
			);
		const before = internal._sourceMapAsObject;
		expect(before).toBeDefined();
		source.clearCache();
		expect(internal._sourceMapAsObject).toBe(before);
	});

	it("`{ parsedMap: true }` is a no-op when no serialized form survives", () => {
		const sm = {
			version: 3,
			sources: ["a.js"],
			names: [],
			mappings: "AAAA",
			file: "out.js",
		};
		const source = new SourceMapSource("hello\n", "out.js", sm);
		// Do not call getArgsAsBuffers — no buffer/string form is held, so
		// the parsed object is the only representation and must be kept.
		const internal =
			/** @type {{ _sourceMapAsObject?: { mappings: string } }} */ (
				/** @type {unknown} */ (source)
			);
		const before = internal._sourceMapAsObject;
		expect(before).toBeDefined();
		source.clearCache({ parsedMap: true });
		expect(internal._sourceMapAsObject).toBe(before);
	});

	it("getCachedData() after clearCache() rehydrates buffer and preserves CachedData contract", () => {
		const cached = new CachedSource(
			new OriginalSource("Hello World", "file.js"),
		);
		cached.sourceAndMap();
		cached.size();
		cached.updateHash(crypto.createHash("md5"));

		// Default clearCache drops source + maps; hash + size survive.
		cached.clearCache();
		const data = cached.getCachedData();

		// `CachedData.buffer` is required by the type contract — even
		// after clearCache(), getCachedData() must return a Buffer so
		// downstream persistent-cache writers don't crash. The buffer
		// is rehydrated via the wrapped source.
		expect(Buffer.isBuffer(data.buffer)).toBe(true);
		expect(data.buffer.toString("utf8")).toBe("Hello World");
		// Maps were cleared — the bufferedMaps Map is empty.
		expect(data.maps.size).toBe(0);
		// Hash + size survive a default clearCache.
		expect(data.hash).toBeDefined();
		expect(data.size).toBe(11);

		// Round-trip: feeding the cleared data into a new CachedSource
		// reads back the same source content.
		const rehydrated = new CachedSource(
			new OriginalSource("Hello World", "file.js"),
			data,
		);
		expect(rehydrated.source()).toBe("Hello World");
	});

	it("composite over CachedSource clears nested cache via single call", () => {
		const inner = new TrackedSource(new OriginalSource("Hello", "hello.js"));
		const cached = new CachedSource(inner);
		const concat = new ConcatSource(cached, new RawSource("\n//eof"));

		// Warm caches.
		concat.source();
		concat.map();

		concat.clearCache();
		expect(inner.calls.clearCache).toBe(1);

		// Re-querying still produces the same output.
		expect(concat.source()).toBe("Hello\n//eof");
	});
});
