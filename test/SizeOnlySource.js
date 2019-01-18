require("should");
var SizeOnlySource = require("../lib/SizeOnlySource");

describe("SizeOnlySource", function() {
	it("should report the size", function() {
		var source = new SizeOnlySource(42);
		source.size().should.be.eql(42);
	});

	for (const method of ["source", "map", "sourceAndMap", "buffer"]) {
		it("should throw on " + method + "()", function() {
			var source = new SizeOnlySource(42);
			(() => {
				source[method]();
			}).should.throwError(/not available/);
		});
	}
});
