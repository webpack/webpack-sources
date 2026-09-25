"use strict";

const assert = require("assert");
const { describe, it } = require("node:test");
const { Source } = require("../");

describe("source", () => {
	it("should throw an Abstract error for source()", () => {
		const source = new Source();
		assert.throws(() => {
			source.source();
		}, /Abstract/);
	});

	it("should throw an Abstract error for updateHash()", () => {
		const source = new Source();
		assert.throws(() => {
			source.updateHash({
				// @ts-expect-error for tests
				update() {},
			});
		}, /Abstract/);
	});

	it("should return null for map() by default", () => {
		class DummySource extends Source {
			source() {
				return "dummy";
			}
		}
		const source = new DummySource();
		assert.strictEqual(source.map(), null);
	});

	it("should return source and map for sourceAndMap()", () => {
		class DummySource extends Source {
			source() {
				return "dummy";
			}
		}
		const source = new DummySource();
		assert.deepStrictEqual(source.sourceAndMap(), {
			source: "dummy",
			map: null,
		});
	});

	it("should compute buffer from string source by default", () => {
		class DummySource extends Source {
			source() {
				return "dummy";
			}
		}
		const source = new DummySource();
		assert.deepStrictEqual(source.buffer(), Buffer.from("dummy", "utf8"));
	});

	it("should return buffer when source is already a buffer", () => {
		const buffer = Buffer.from([1, 2, 3]);
		class DummySource extends Source {
			source() {
				return buffer;
			}
		}
		const source = new DummySource();
		assert.strictEqual(source.buffer(), buffer);
	});

	it("should compute size from buffer by default", () => {
		class DummySource extends Source {
			source() {
				return "abcdef";
			}
		}
		const source = new DummySource();
		assert.strictEqual(source.size(), 6);
	});

	it("should return a single-entry array for buffers() by default", () => {
		class DummySource extends Source {
			source() {
				return "dummy";
			}
		}
		const source = new DummySource();
		const buffers = source.buffers();
		assert.strictEqual(Array.isArray(buffers), true);
		assert.strictEqual(buffers.length, 1);
		assert.deepStrictEqual(buffers[0], Buffer.from("dummy", "utf8"));
	});

	it("should return the buffer directly from buffers() when source is a buffer", () => {
		const buffer = Buffer.from([1, 2, 3]);
		class DummySource extends Source {
			source() {
				return buffer;
			}
		}
		const source = new DummySource();
		const buffers = source.buffers();
		assert.strictEqual(buffers.length, 1);
		assert.strictEqual(buffers[0], buffer);
	});
});
