"use strict";

const { SizeOnlySource } = require("../");

describe("sizeOnlySource", () => {
	it("should report the size", () => {
		const source = new SizeOnlySource(42);
		expect(source.size()).toBe(42);
	});

	for (const method of ["source", "map", "sourceAndMap", "buffer"]) {
		it(`should throw on ${method}()`, () => {
			const source = new SizeOnlySource(42);
			expect(() => {
				// @ts-expect-error for tests
				source[/** @type {keyof SizeOnlySource} */ (method)]();
			}).toThrow(/not available/);
		});
	}
});
