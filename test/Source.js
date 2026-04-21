"use strict";

const { Source } = require("../");

describe("source", () => {
	it("should throw an Abstract error for source()", () => {
		const source = new Source();
		expect(() => {
			source.source();
		}).toThrow("Abstract");
	});

	it("should throw an Abstract error for updateHash()", () => {
		const source = new Source();
		expect(() => {
			source.updateHash({
				// @ts-expect-error for tests
				update() {},
			});
		}).toThrow("Abstract");
	});

	it("should return null for map() by default", () => {
		class DummySource extends Source {
			source() {
				return "dummy";
			}
		}
		const source = new DummySource();
		expect(source.map()).toBeNull();
	});

	it("should return source and map for sourceAndMap()", () => {
		class DummySource extends Source {
			source() {
				return "dummy";
			}
		}
		const source = new DummySource();
		expect(source.sourceAndMap()).toEqual({
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
		expect(source.buffer()).toEqual(Buffer.from("dummy", "utf8"));
	});

	it("should return buffer when source is already a buffer", () => {
		const buffer = Buffer.from([1, 2, 3]);
		class DummySource extends Source {
			source() {
				return buffer;
			}
		}
		const source = new DummySource();
		expect(source.buffer()).toBe(buffer);
	});

	it("should compute size from buffer by default", () => {
		class DummySource extends Source {
			source() {
				return "abcdef";
			}
		}
		const source = new DummySource();
		expect(source.size()).toBe(6);
	});
});
