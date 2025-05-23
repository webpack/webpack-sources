"use strict";

jest.mock("./__mocks__/createMappingsSerializer");

const CompatSource = require("../").CompatSource;
const RawSource = require("../").RawSource;

describe("CompatSource", () => {
	it("should emulate all methods", () => {
		const CONTENT = "Line1\n\nLine3\n";
		const source = CompatSource.from({
			source() {
				return CONTENT;
			},
			size() {
				return 42;
			}
		});
		expect(CompatSource.from(source)).toEqual(source);
		const rawSource = new RawSource(CONTENT);
		expect(CompatSource.from(rawSource)).toEqual(rawSource);
		expect(source.source()).toEqual(CONTENT);
		expect(source.size()).toBe(42);
		expect(source.buffer()).toEqual(Buffer.from(CONTENT));
		expect(source.map()).toBe(null);
		const sourceAndMap = source.sourceAndMap();
		expect(sourceAndMap).toHaveProperty("source", CONTENT);
		expect(sourceAndMap).toHaveProperty("map", null);
		/** @type {(string | Buffer)[]} */
		const calledWith = [];
		source.updateHash({
			// @ts-expect-error for tests
			update(value) {
				calledWith.push(value);
			}
		});
		expect(calledWith).toEqual([Buffer.from(CONTENT)]);
	});
});
