"use strict";

const assert = require("assert");
const crypto = require("crypto");
const { describe, it } = require("node:test");

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
		assert.doesNotThrow(() => {
			dummy.clearCache();
		});
	});

	it("cachedSource drops cached maps and source entries", () => {
		const inner = new TrackedSource(
			new OriginalSource("TestTestTest", "file.js"),
		);
		const cached = new CachedSource(inner);

		assert.strictEqual(cached.source(), "TestTestTest");
		assert.strictEqual(typeof cached.map(), "object");
		assert.strictEqual(typeof cached.map({ columns: false }), "object");
		assert.strictEqual(inner.calls.source, 1);
		assert.strictEqual(inner.calls.map, 2);

		cached.clearCache();
		assert.strictEqual(inner.calls.clearCache, 1);

		// After clearCache, queries go back to the wrapped source.
		assert.strictEqual(cached.source(), "TestTestTest");
		assert.strictEqual(typeof cached.map(), "object");
		assert.strictEqual(typeof cached.map({ columns: false }), "object");
		assert.strictEqual(inner.calls.source, 2);
		assert.strictEqual(inner.calls.map, 4);
	});

	it("cachedSource does not invoke a lazy `_source` when cleared", () => {
		let lazyCalls = 0;
		const lazy = () => {
			lazyCalls++;
			return new OriginalSource("Lazy", "lazy.js");
		};
		const cached = new CachedSource(lazy);

		cached.clearCache();
		assert.strictEqual(lazyCalls, 0);
		assert.strictEqual(cached.source(), "Lazy");
		assert.strictEqual(lazyCalls, 1);
	});

	it("cachedSource clearCache preserves source contract", () => {
		const cached = new CachedSource(
			new OriginalSource("Hello World", "file.js"),
		);
		assert.strictEqual(cached.size(), 11);
		assert.strictEqual(cached.source(), "Hello World");
		assert.strictEqual(cached.buffer().toString("utf8"), "Hello World");
		cached.clearCache();
		assert.strictEqual(cached.size(), 11);
		assert.strictEqual(cached.source(), "Hello World");
		assert.strictEqual(cached.buffer().toString("utf8"), "Hello World");
	});

	it("concatSource recursively clears children", () => {
		const a = new TrackedSource(new OriginalSource("A", "a.js"));
		const b = new TrackedSource(new OriginalSource("B", "b.js"));
		const concat = new ConcatSource(a, "literal-string", b);

		concat.clearCache();
		assert.strictEqual(a.calls.clearCache, 1);
		assert.strictEqual(b.calls.clearCache, 1);
	});

	it("prefixSource recursively clears the inner source", () => {
		const inner = new TrackedSource(new OriginalSource("body", "f.js"));
		const prefixed = new PrefixSource("> ", inner);
		prefixed.clearCache();
		assert.strictEqual(inner.calls.clearCache, 1);
	});

	it("replaceSource recursively clears the inner source", () => {
		const inner = new TrackedSource(new OriginalSource("body", "f.js"));
		const replaced = new ReplaceSource(inner);
		replaced.clearCache();
		assert.strictEqual(inner.calls.clearCache, 1);
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
		assert.strictEqual(clearCalled, 1);
	});

	it("compatSource silently ignores source-likes without clearCache", () => {
		const sourceLike = { source: () => "x" };
		const compat = new CompatSource(sourceLike);
		assert.doesNotThrow(() => {
			compat.clearCache();
		});
	});

	it("rawSource drops the secondary buffer cache when constructed from a string", () => {
		const raw = new RawSource("hello");
		// Materialise the buffer form, then clear.
		raw.buffer();
		const internal = /** @type {{ _valueAsBuffer?: Buffer }} */ (
			/** @type {unknown} */ (raw)
		);
		assert.notStrictEqual(internal._valueAsBuffer, undefined);
		raw.clearCache();
		assert.strictEqual(internal._valueAsBuffer, undefined);
		// Data is preserved via the primary string form.
		assert.strictEqual(raw.source(), "hello");
		assert.strictEqual(raw.buffer().toString("utf8"), "hello");
	});

	it("rawSource keeps the primary buffer when constructed from a Buffer", () => {
		const raw = new RawSource(Buffer.from("hello", "utf8"));
		raw.source();
		raw.clearCache();
		assert.strictEqual(raw.buffer().toString("utf8"), "hello");
	});

	it("originalSource drops the cached string when constructed from a Buffer", () => {
		const orig = new OriginalSource(Buffer.from("hello", "utf8"), "f.js");
		// Cause the string form to be cached.
		orig.source();
		orig.clearCache();
		assert.strictEqual(orig.source(), "hello");
		assert.strictEqual(orig.buffer().toString("utf8"), "hello");
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
		assert.strictEqual(source.source(), "hello\n");
		const map = /** @type {{ mappings: string }} */ (source.map());
		assert.strictEqual(map.mappings, "AAAA");
		// Round-trip the buffers once more to confirm internal state stays
		// consistent after clearCache.
		const [valueBuf, name, smBuf, origBuf, innerBuf] =
			source.getArgsAsBuffers();
		assert.strictEqual(valueBuf.toString("utf8"), "hello\n");
		assert.strictEqual(name, "out.js");
		assert.strictEqual(JSON.parse(smBuf.toString("utf8")).mappings, "AAAA");
		assert.strictEqual(
			/** @type {Buffer} */ (origBuf).toString("utf8"),
			"original\n",
		);
		assert.strictEqual(
			JSON.parse(/** @type {Buffer} */ (innerBuf).toString("utf8")).file,
			"a.js",
		);
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
		assert.strictEqual(sharedInner.calls.clearCache, 1);
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

		assert.strictEqual(sharedInner.calls.clearCache, 2);
	});

	it("`{ maps: true, source: false }` keeps the cached source string", () => {
		const inner = new TrackedSource(new OriginalSource("body", "f.js"));
		const cached = new CachedSource(inner);

		cached.source();
		cached.map();
		const sourceCallsBefore = inner.calls.source;

		cached.clearCache({ maps: true, source: false });

		// source() served from cache (no new call to inner).
		assert.strictEqual(cached.source(), "body");
		assert.strictEqual(inner.calls.source, sourceCallsBefore);
		// map() re-walks inner because the map cache was dropped.
		const mapCallsBefore = inner.calls.map;
		cached.map();
		assert.strictEqual(inner.calls.map, mapCallsBefore + 1);
	});

	it("default clearCache preserves the cached hash payload", () => {
		const inner = new OriginalSource("body", "f.js");
		const cached = new CachedSource(inner);
		cached.updateHash(crypto.createHash("md5"));
		const internal = /** @type {{ _cachedHashUpdate?: unknown[] }} */ (
			/** @type {unknown} */ (cached)
		);
		const before = internal._cachedHashUpdate;
		assert.notStrictEqual(before, undefined);
		cached.clearCache();
		assert.strictEqual(internal._cachedHashUpdate, before);
	});

	it("default clearCache keeps the cached byte size", () => {
		const cached = new CachedSource(new OriginalSource("hello", "f.js"));
		cached.size();
		const internal = /** @type {{ _cachedSize?: number }} */ (
			/** @type {unknown} */ (cached)
		);
		assert.strictEqual(internal._cachedSize, 5);
		cached.clearCache();
		assert.strictEqual(internal._cachedSize, 5);
	});

	it("cachedSource reuses the `_cachedMaps` Map instead of reallocating", () => {
		const cached = new CachedSource(new OriginalSource("body", "f.js"));
		cached.map();
		const internal = /** @type {{ _cachedMaps: Map<string, unknown> }} */ (
			/** @type {unknown} */ (cached)
		);
		const before = internal._cachedMaps;
		cached.clearCache();
		assert.strictEqual(internal._cachedMaps, before);
		assert.strictEqual(internal._cachedMaps.size, 0);
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
		assert.notStrictEqual(internal._sourceMapAsObject, undefined);
		assert.notStrictEqual(internal._sourceMapAsBuffer, undefined);
		source.clearCache({ parsedMap: true });
		assert.strictEqual(internal._sourceMapAsObject, undefined);
		// map() rehydrates from the buffer — value preserved.
		const map = /** @type {{ mappings: string }} */ (source.map());
		assert.strictEqual(map.mappings, "AAAA");
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
		assert.notStrictEqual(before, undefined);
		source.clearCache();
		assert.strictEqual(internal._sourceMapAsObject, before);
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
		assert.notStrictEqual(before, undefined);
		source.clearCache({ parsedMap: true });
		assert.strictEqual(internal._sourceMapAsObject, before);
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
		assert.strictEqual(Buffer.isBuffer(data.buffer), true);
		assert.strictEqual(data.buffer.toString("utf8"), "Hello World");
		// Maps were cleared — the bufferedMaps Map is empty.
		assert.strictEqual(data.maps.size, 0);
		// Hash + size survive a default clearCache.
		assert.notStrictEqual(data.hash, undefined);
		assert.strictEqual(data.size, 11);

		// Round-trip: feeding the cleared data into a new CachedSource
		// reads back the same source content.
		const rehydrated = new CachedSource(
			new OriginalSource("Hello World", "file.js"),
			data,
		);
		assert.strictEqual(rehydrated.source(), "Hello World");
	});

	it("composite over CachedSource clears nested cache via single call", () => {
		const inner = new TrackedSource(new OriginalSource("Hello", "hello.js"));
		const cached = new CachedSource(inner);
		const concat = new ConcatSource(cached, new RawSource("\n//eof"));

		// Warm caches.
		concat.source();
		concat.map();

		concat.clearCache();
		assert.strictEqual(inner.calls.clearCache, 1);

		// Re-querying still produces the same output.
		assert.strictEqual(concat.source(), "Hello\n//eof");
	});
});
