jest.mock("../lib/helpers/createMappingsSerializer");
const PrefixSource = require("../").PrefixSource;
const OriginalSource = require("../").OriginalSource;
const ConcatSource = require("../").ConcatSource;
const { withReadableMappings } = require("./helpers");

describe("PrefixSource", () => {
	it("should prefix a source", () => {
		const source = new PrefixSource(
			"\t",
			new OriginalSource(
				"console.log('test');console.log('test2');\nconsole.log('test22');\n",
				"console.js"
			)
		);
		const expectedMap1 = {
			version: 3,
			file: "x",
			mappings: "AAAA;AACA",
			names: [],
			sources: ["console.js"],
			sourcesContent: [
				"console.log('test');console.log('test2');\nconsole.log('test22');\n"
			]
		};
		const expectedSource = [
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
		const expectedMap2 = {
			version: 3,
			file: "x",
			mappings: "CAAA,oBAAoB;CACpB",
			names: [],
			sources: ["console.js"],
			sourcesContent: [
				"console.log('test');console.log('test2');\nconsole.log('test22');\n"
			]
		};
		const result = source.sourceAndMap();
		expect(result.source).toEqual(expectedSource);
		expect(withReadableMappings(result.map)).toEqual(
			withReadableMappings(expectedMap2)
		);
		expect(withReadableMappings(source.map())).toEqual(
			withReadableMappings(expectedMap2)
		);
	});

	it("should have consistent source/sourceAndMap behavior", () => {
		const source = new PrefixSource(
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

		const actualSource = source.source();
		const expectedSource = [
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
		const source = new PrefixSource(
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
