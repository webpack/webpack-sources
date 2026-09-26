"use strict";

const assert = require("assert");
const { describe, it } = require("node:test");
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
		assert.deepStrictEqual(CompatSource.from(source), source);
		const rawSource = new RawSource(CONTENT);
		assert.deepStrictEqual(CompatSource.from(rawSource), rawSource);
		assert.deepStrictEqual(source.source(), CONTENT);
		assert.strictEqual(source.size(), 42);
		assert.deepStrictEqual(source.buffer(), Buffer.from(CONTENT));
		assert.strictEqual(source.map(), null);
		const sourceAndMap = source.sourceAndMap();
		assert.strictEqual(sourceAndMap.source, CONTENT);
		assert.strictEqual(sourceAndMap.map, null);
		/** @type {(string | Buffer)[]} */
		const calledWith = [];
		source.updateHash({
			// @ts-expect-error for tests
			update(value) {
				calledWith.push(value);
			},
		});
		assert.deepStrictEqual(calledWith, [Buffer.from(CONTENT)]);
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
		assert.strictEqual(source.buffer(), buffer);
	});

	it("should use buffers from source-like when provided", () => {
		const buffers = [Buffer.from("a"), Buffer.from("b")];
		const source = CompatSource.from({
			source() {
				return "ab";
			},
			buffers() {
				return buffers;
			},
		});
		assert.strictEqual(source.buffers(), buffers);
	});

	it("should fall back to super buffers() when sourceLike doesn't provide it", () => {
		const CONTENT = "Hello";
		const source = CompatSource.from({
			source() {
				return CONTENT;
			},
		});
		const buffers = source.buffers();
		assert.strictEqual(buffers.length, 1);
		assert.deepStrictEqual(buffers[0], Buffer.from(CONTENT));
	});

	it("should use size from super when sourceLike doesn't define size", () => {
		const CONTENT = "Hello";
		const source = CompatSource.from({
			source() {
				return CONTENT;
			},
		});
		assert.strictEqual(source.size(), 5);
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
		assert.strictEqual(source.map(), map);
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
		assert.strictEqual(source.sourceAndMap(), sourceAndMap);
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
		assert.deepStrictEqual(calledWith, ["custom-hash"]);
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
		assert.throws(() => {
			source.updateHash({
				// @ts-expect-error for tests
				update() {},
			});
		}, /'map' method must also provide an 'updateHash' method/);
	});
});
