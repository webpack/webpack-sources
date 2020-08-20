var SizeOnlySource = require("../").SizeOnlySource;

describe("SizeOnlySource", () => {
	it("should report the size", () => {
		var source = new SizeOnlySource(42);
		expect(source.size()).toBe(42);
	});

	for (const method of ["source", "map", "sourceAndMap", "buffer"]) {
		it("should throw on " + method + "()", () => {
			var source = new SizeOnlySource(42);
			expect(() => {
				source[method]();
			}).toThrowError(/not available/);
		});
	}
});
