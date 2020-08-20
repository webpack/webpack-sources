var PrefixSource = require("../").PrefixSource;
var OriginalSource = require("../").OriginalSource;
var ConcatSource = require("../").ConcatSource;

describe("PrefixSource", () => {
	it("should prefix a source", () => {
		var source = new PrefixSource(
			"\t",
			new OriginalSource(
				"console.log('test');console.log('test2');\nconsole.log('test22');\n",
				"console.js"
			)
		);
		var expectedMap1 = {
			version: 3,
			file: "x",
			mappings: "AAAA;AACA;",
			sources: ["console.js"],
			sourcesContent: [
				"console.log('test');console.log('test2');\nconsole.log('test22');\n"
			]
		};
		var expectedSource = [
			"\tconsole.log('test');console.log('test2');",
			"\tconsole.log('test22');",
			""
		].join("\n");
		expect(source.size()).toBe(67);
		expect(source.source()).toEqual(expectedSource);
		expect(
			source.map({
				columns: false
			})
		).toEqual(expectedMap1);
		expect(
			source.sourceAndMap({
				columns: false
			})
		).toEqual({
			source: expectedSource,
			map: expectedMap1
		});
		var expectedMap2 = {
			version: 3,
			file: "x",
			mappings: "CAAA,oBAAoB;CACpB",
			names: [],
			sources: ["console.js"],
			sourcesContent: [
				"console.log('test');console.log('test2');\nconsole.log('test22');\n"
			]
		};
		expect(source.map()).toEqual(expectedMap2);
		expect(source.sourceAndMap()).toEqual({
			source: expectedSource,
			map: expectedMap2
		});
	});

	it("should have consistent source/sourceAndMap behavior", () => {
		var source = new PrefixSource(
			"\t",
			new ConcatSource(
				new OriginalSource("console.log('test');\n", "consoleA.js"),
				new OriginalSource("\nconsole.log('test1');\n\n", "consoleB.js"),
				new OriginalSource("\nconsole.log('test2');\n", "consoleC.js"),
				new OriginalSource("console.log('test3');", "consoleD.js"),
				new OriginalSource("\n", "empty.js"),
				new OriginalSource("console.log('test4');", "consoleE.js")
			)
		);

		var actualSource = source.source();
		var expectedSource = [
			"\tconsole.log('test');\n",
			"\t\n\tconsole.log('test1');\n\t\n",
			"\t\n\tconsole.log('test2');\n",
			"\tconsole.log('test3');",
			"\n\t",
			"console.log('test4');"
		].join("");

		expect(actualSource).toEqual(expectedSource);
		expect(actualSource).toEqual(source.sourceAndMap().source);
	});

	it("should handle newlines correctly", () => {
		var source = new PrefixSource(
			"*",
			new ConcatSource(
				"Line",
				" and more\n",
				"double nl\n\n",
				"nl\nline\nin\nline\n",
				"\nstart with nl",
				"\n\n\nempty lines"
			)
		);

		expect(source.sourceAndMap().source).toEqual(source.source());
	});
});
