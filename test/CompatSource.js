"use strict";

jest.mock("./__mocks__/createMappingsSerializer");

const { CompatSource } = require("../");
const { RawSource } = require("../");

describe("compatSource", () => {
	it("should emulate all methods", () => {
		const CONTENT = "Line1\n\nLine3\n";
		const source = CompatSource.from({
			source() {
				return CONTENT;
			},
			size() {
				return 42;
			},
		});
		expect(CompatSource.from(source)).toEqual(source);
		const rawSource = new RawSource(CONTENT);
		expect(CompatSource.from(rawSource)).toEqual(rawSource);
		expect(source.source()).toEqual(CONTENT);
		expect(source.size()).toBe(42);
		expect(source.buffer()).toEqual(Buffer.from(CONTENT));
		expect(source.map()).toBeNull();
		const sourceAndMap = source.sourceAndMap();
		expect(sourceAndMap).toHaveProperty("source", CONTENT);
		expect(sourceAndMap).toHaveProperty("map", null);
		/** @type {(string | Buffer)[]} */
		const calledWith = [];
		source.updateHash({
			// @ts-expect-error for tests
			update(value) {
				calledWith.push(value);
			},
		});
		expect(calledWith).toEqual([Buffer.from(CONTENT)]);
	});

	it("should use buffer from source-like when provided", () => {
		const CONTENT = "Line1\n\nLine3\n";
		const buffer = Buffer.from(CONTENT);
		const source = CompatSource.from({
			source() {
				return CONTENT;
			},
			buffer() {
				return buffer;
			},
		});
		expect(source.buffer()).toBe(buffer);
	});

	it("should use size from super when sourceLike doesn't define size", () => {
		const CONTENT = "Hello";
		const source = CompatSource.from({
			source() {
				return CONTENT;
			},
		});
		expect(source.size()).toBe(5);
	});

	it("should call map from sourceLike when provided", () => {
		const map = {
			version: 3,
			sources: ["a.js"],
			names: [],
			mappings: "",
			file: "x",
		};
		const source = CompatSource.from({
			source() {
				return "content";
			},
			map() {
				return map;
			},
			updateHash(hash) {
				hash.update("custom");
			},
		});
		expect(source.map()).toBe(map);
	});

	it("should call sourceAndMap from sourceLike when provided", () => {
		const map = {
			version: 3,
			sources: ["a.js"],
			names: [],
			mappings: "",
			file: "x",
		};
		const sourceAndMap = { source: "content", map };
		const source = CompatSource.from({
			source() {
				return "content";
			},
			sourceAndMap() {
				return sourceAndMap;
			},
		});
		expect(source.sourceAndMap()).toBe(sourceAndMap);
	});

	it("should call updateHash from sourceLike when provided", () => {
		/** @type {(string | Buffer)[]} */
		const calledWith = [];
		const source = CompatSource.from({
			source() {
				return "content";
			},
			updateHash(hash) {
				hash.update("custom-hash");
			},
		});
		source.updateHash({
			// @ts-expect-error for tests
			update(value) {
				calledWith.push(value);
			},
		});
		expect(calledWith).toEqual(["custom-hash"]);
	});

	it("should throw when map is defined but updateHash is not", () => {
		const source = CompatSource.from({
			source() {
				return "content";
			},
			map() {
				return null;
			},
		});
		expect(() => {
			source.updateHash({
				// @ts-expect-error for tests
				update() {},
			});
		}).toThrow(/'map' method must also provide an 'updateHash' method/);
	});
});
