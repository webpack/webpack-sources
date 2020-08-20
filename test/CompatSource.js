var should = require("should");
var CompatSource = require("../").CompatSource;
var RawSource = require("../").RawSource;

describe("CompatSource", function() {
	it("should emulate all methods", function() {
		var CONTENT = "Line1\n\nLine3\n";
		var source = CompatSource.from({
			source() {
				return CONTENT;
			},
			size() {
				return 42;
			}
		});
		CompatSource.from(source).should.be.eql(source);
		const rawSource = new RawSource(CONTENT);
		CompatSource.from(rawSource).should.be.eql(rawSource);
		source.source().should.be.eql(CONTENT);
		source.size().should.be.eql(42);
		source.buffer().should.be.eql(Buffer.from(CONTENT));
		should(source.map()).be.eql(null);
		const sourceAndMap = source.sourceAndMap();
		sourceAndMap.should.have.property("source").be.eql(CONTENT);
		sourceAndMap.should.have.property("map").be.eql(null);
		const calledWith = [];
		source.updateHash({
			update(value) {
				calledWith.push(value);
			}
		});
		calledWith.should.be.eql([Buffer.from(CONTENT)]);
	});
});
