const {
	readTokens,
	END_SEGMENT,
	NEXT_LINE,
	INVALID
} = require("../lib/helpers/vlq.js");

describe("readTokens", () => {
	it("should read tokens correctly", () => {
		const tokens = [];
		readTokens("A,C,D;AAgBC*A", (control, value) => {
			tokens.push([control, value]);
		});
		expect(tokens).toEqual([
			[0, 0],
			[END_SEGMENT, 0],
			[0, 1],
			[END_SEGMENT, 0],
			[0, -1],
			[NEXT_LINE, 0],
			[0, 0],
			[0, 0],
			[0, 16],
			[0, 1],
			[INVALID, 0],
			[0, 0]
		]);
	});
});
