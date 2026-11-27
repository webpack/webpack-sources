"use strict";

const assert = require("assert");
const crypto = require("crypto");
const { afterEach, describe, it } = require("node:test");
const {
	CachedSource,
	ConcatSource,
	OriginalSource,
	PrefixSource,
	RawSource,
	ReplaceSource,
	SourceMapSource,
	util,
} = require("../");
const bytes = require("../lib/helpers/bytes");

const { getBufferOutputType, setBufferOutputType } = util.stringBufferUtils;

const SAMPLES = [
	"",
	"ascii only\n",
	"latin1 é ü ß\n",
	"bmp 中文 €\n",
	"astral 😀 𝄞\n",
	"﻿leading bom",
	"lone high \uD800 surrogate",
	"lone low \uDC00 surrogate",
	"high at end \uD83D",
];

/**
 * @param {string} str string
 * @returns {Uint8Array} plain (non-Buffer) Uint8Array holding the utf8 bytes
 */
const plain = (str) => new Uint8Array(Buffer.from(str, "utf8"));

/**
 * Loads a fresh copy of the bytes helpers with `TextEncoder` / `TextDecoder`
 * hidden, to exercise the `Buffer` fallback used on old Node.js versions.
 * @returns {typeof bytes} helpers
 */
const loadWithoutEncoding = () => {
	const { TextEncoder, TextDecoder } = globalThis;
	const scope =
		/** @type {{ TextEncoder?: unknown, TextDecoder?: unknown }} */ (
			globalThis
		);
	const path = require.resolve("../lib/helpers/bytes");
	const cached = require.cache[path];
	delete require.cache[path];
	try {
		delete scope.TextEncoder;
		delete scope.TextDecoder;
		return require("../lib/helpers/bytes");
	} finally {
		globalThis.TextEncoder = TextEncoder;
		globalThis.TextDecoder = TextDecoder;
		require.cache[path] = cached;
	}
};

describe("bytes helpers", () => {
	/** @type {[string, typeof bytes][]} */
	const variants = [
		["typed array", bytes],
		["Buffer fallback", loadWithoutEncoding()],
	];
	for (const [name, helpers] of variants) {
		describe(name, () => {
			it("encodes and decodes utf8 like Buffer", () => {
				for (const str of SAMPLES) {
					const encoded = helpers.encodeUtf8(str);
					assert.ok(encoded instanceof Uint8Array);
					assert.deepStrictEqual(
						Buffer.from(encoded),
						Buffer.from(str, "utf8"),
						JSON.stringify(str),
					);
					assert.strictEqual(
						helpers.decodeUtf8(encoded),
						Buffer.from(str, "utf8").toString("utf8"),
						JSON.stringify(str),
					);
					assert.strictEqual(
						helpers.decodeUtf8(plain(str)),
						Buffer.from(str, "utf8").toString("utf8"),
					);
				}
			});

			it("keeps a leading BOM when decoding", () => {
				assert.strictEqual(helpers.decodeUtf8(Buffer.from("﻿x", "utf8")), "﻿x");
			});

			it("decodes invalid utf8 like Buffer", () => {
				const invalid = new Uint8Array([0x61, 0xff, 0xc3, 0x62, 0xe2, 0x82]);
				assert.strictEqual(
					helpers.decodeUtf8(invalid),
					Buffer.from(invalid).toString("utf8"),
				);
			});

			it("decodes a view at an offset", () => {
				const all = Buffer.from("skip-keep", "utf8");
				assert.strictEqual(
					helpers.decodeUtf8(new Uint8Array(all.buffer, all.byteOffset + 5, 4)),
					"keep",
				);
			});
		});
	}

	it("computes utf8 byte length like Buffer.byteLength", () => {
		for (const str of [...SAMPLES, "x".repeat(1000) + "é".repeat(10)]) {
			const expected = Buffer.byteLength(str, "utf8");
			assert.strictEqual(bytes.utf8ByteLength(str), expected);
			assert.strictEqual(
				bytes.countUtf8Bytes(str),
				expected,
				JSON.stringify(str),
			);
		}
	});

	it("concatenates into a copy", () => {
		const a = plain("ab");
		const one = bytes.concatBytes([a]);
		assert.notStrictEqual(one, a);
		assert.deepStrictEqual([...one], [...a]);
		assert.deepStrictEqual(
			Buffer.from(bytes.concatBytes([a, Buffer.from("c"), plain("")])),
			Buffer.from("abc"),
		);
		assert.strictEqual(bytes.concatBytes([]).length, 0);
	});

	it("compares bytes", () => {
		assert.ok(bytes.equalBytes(plain("abc"), Buffer.from("abc")));
		assert.ok(!bytes.equalBytes(plain("abc"), plain("abd")));
		assert.ok(!bytes.equalBytes(plain("abc"), plain("ab")));
	});

	it("detects bytes", () => {
		assert.ok(bytes.isBytes(Buffer.from("a")));
		assert.ok(bytes.isBytes(new Uint8Array(1)));
		assert.ok(!bytes.isBytes("a"));
		assert.ok(!bytes.isBytes(new Uint16Array(1)));
		assert.ok(!bytes.isBytes(undefined));
	});

	it("rejects an unknown output type", () => {
		assert.throws(
			() =>
				setBufferOutputType(
					/** @type {"buffer"} */ (/** @type {unknown} */ ("nope")),
				),
			TypeError,
		);
	});
});

describe("buffer output type", () => {
	afterEach(() => setBufferOutputType("buffer"));

	it("defaults to Buffer", () => {
		assert.strictEqual(getBufferOutputType(), "buffer");
		assert.ok(Buffer.isBuffer(new RawSource("x").buffer()));
		assert.ok(Buffer.isBuffer(new RawSource(plain("x")).buffer()));
		assert.ok(Buffer.isBuffer(new RawSource(plain("x")).source()));
	});

	it("wraps plain Uint8Array without copying", () => {
		const input = plain("hello");
		const out = new RawSource(input).buffer();
		assert.ok(Buffer.isBuffer(out));
		assert.strictEqual(out.buffer, input.buffer);
	});

	it("hands out plain Uint8Array with 'uint8array'", () => {
		setBufferOutputType("uint8array");
		const sources = [
			new RawSource("a é"),
			new OriginalSource("a é", "file.js"),
			new SourceMapSource("a é", "file.js", {
				version: 3,
				sources: ["file.js"],
				names: [],
				mappings: "AAAA",
				file: "x",
			}),
			new ConcatSource("a ", new RawSource("é")),
			new PrefixSource("> ", "a é"),
			new ReplaceSource(new RawSource("a x"), "r"),
			new CachedSource(new RawSource("a é")),
		];
		for (const source of sources) {
			const out = /** @type {Uint8Array} */ (source.buffer());
			assert.ok(out instanceof Uint8Array, source.constructor.name);
			assert.ok(!Buffer.isBuffer(out), source.constructor.name);
			for (const item of source.buffers()) {
				assert.ok(!Buffer.isBuffer(item), source.constructor.name);
			}
			assert.strictEqual(source.size(), out.length);
		}
	});

	it("hands out a zero-copy plain view of Buffer input with 'uint8array'", () => {
		setBufferOutputType("uint8array");
		const input = Buffer.from("hello");
		const out = /** @type {Uint8Array} */ (new RawSource(input).buffer());
		assert.ok(!Buffer.isBuffer(out));
		assert.strictEqual(out.buffer, input.buffer);
		assert.strictEqual(out.byteOffset, input.byteOffset);
		assert.strictEqual(out.length, input.length);
	});

	it("hashes the same in both modes", () => {
		const digest = (/** @type {() => CachedSource} */ create) => {
			const hash = crypto.createHash("md5");
			create().updateHash(hash);
			return hash.digest("hex");
		};
		const create = () =>
			new CachedSource(
				new SourceMapSource(
					plain("a é"),
					"file.js",
					plain(
						JSON.stringify({
							version: 3,
							sources: ["file.js"],
							names: [],
							mappings: "AAAA",
						}),
					),
					plain("orig é"),
				),
			);
		const asBuffer = digest(create);
		setBufferOutputType("uint8array");
		assert.strictEqual(digest(create), asBuffer);
	});
});

describe("Uint8Array input", () => {
	for (const str of SAMPLES) {
		it(`round-trips ${JSON.stringify(str)}`, () => {
			const expected = Buffer.from(str, "utf8");
			const raw = new RawSource(plain(str));
			assert.strictEqual(raw.isBuffer(), true);
			assert.deepStrictEqual(raw.buffer(), expected);
			assert.strictEqual(raw.size(), expected.length);

			const converted = new RawSource(plain(str), true);
			assert.strictEqual(converted.source(), expected.toString("utf8"));

			const original = new OriginalSource(plain(str), "file.js");
			assert.strictEqual(original.source(), expected.toString("utf8"));
			assert.strictEqual(
				original.size(),
				new OriginalSource(str, "file.js").size(),
			);

			const prefixed = new PrefixSource("// ", plain(str));
			assert.strictEqual(
				prefixed.source(),
				new PrefixSource("// ", expected.toString("utf8")).source(),
			);

			const concat = new ConcatSource(
				new RawSource(plain(str)),
				"!",
				new RawSource(str),
			);
			assert.deepStrictEqual(
				concat.buffer(),
				Buffer.concat([expected, Buffer.from("!"), expected]),
			);
		});
	}

	it("accepts Uint8Array source maps", () => {
		const map = {
			version: 3,
			sources: ["file.js"],
			names: [],
			mappings: "AAAA",
			sourcesContent: ["orig"],
			file: "x",
		};
		const fromString = new SourceMapSource("code", "x", map, "orig");
		const fromBytes = new SourceMapSource(
			plain("code"),
			"x",
			plain(JSON.stringify(map)),
			plain("orig"),
		);
		assert.deepStrictEqual(fromBytes.map(), fromString.map());
		assert.strictEqual(fromBytes.source(), "code");
		for (const item of fromBytes.getArgsAsBuffers()) {
			if (typeof item === "object" && item !== null) {
				assert.ok(Buffer.isBuffer(item));
			}
		}
	});

	it("restores CachedSource from cached data holding Uint8Array", () => {
		const original = new OriginalSource("a é\nb", "file.js");
		const cached = new CachedSource(original);
		cached.map();
		const data = cached.getCachedData();
		const restored = new CachedSource(original, {
			...data,
			buffer: /** @type {Buffer} */ (new Uint8Array(data.buffer)),
		});
		assert.strictEqual(restored.source(), "a é\nb");
		assert.ok(Buffer.isBuffer(restored.buffer()));
		assert.deepStrictEqual(restored.map(), original.map());
	});

	it("reads Uint8Array source maps in originalPositionFor", () => {
		const map = {
			version: 3,
			sources: ["a.js"],
			names: [],
			mappings: "AAAA",
			file: "x",
		};
		assert.deepStrictEqual(
			util.sourceMap.originalPositionFor(plain(JSON.stringify(map)), 1, 0),
			util.sourceMap.originalPositionFor(map, 1, 0),
		);
	});
});
