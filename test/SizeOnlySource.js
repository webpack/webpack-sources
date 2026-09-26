"use strict";

const assert = require("assert");
const { describe, it } = require("node:test");
const { SizeOnlySource } = require("../");

describe("sizeOnlySource", () => {
	it("should report the size", () => {
		const source = new SizeOnlySource(42);
		assert.strictEqual(source.size(), 42);
	});

	for (const method of ["source", "map", "sourceAndMap", "buffer", "buffers"]) {
		it(`should throw on ${method}()`, () => {
			const source = new SizeOnlySource(42);
			assert.throws(() => {
				// @ts-expect-error for tests
				source[/** @type {keyof SizeOnlySource} */ (method)]();
			}, /not available/);
		});
	}

	it("should throw on updateHash()", () => {
		const source = new SizeOnlySource(42);
		assert.throws(() => {
			source.updateHash({
				// @ts-expect-error for tests
				update() {},
			});
		}, /not available/);
	});
});
