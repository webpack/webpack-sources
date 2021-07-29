jest.mock("../lib/helpers/createMappingsSerializer");
const ReplaceSource = require("../").ReplaceSource;
const OriginalSource = require("../").OriginalSource;
const SourceMapSource = require("../").SourceMapSource;
const validate = require("sourcemap-validator");
const { withReadableMappings } = require("./helpers");

describe("ReplaceSource", () => {
	it("should replace correctly", () => {
		let line1, line2, line3, line4, line5;
		const source = new ReplaceSource(
			new OriginalSource(
				[
					(line1 = "Hello World!"),
					(line2 = "{}"),
					(line3 = "Line 3"),
					(line4 = "Line 4"),
					(line5 = "Line 5"),
					"Last",
					"Line"
				].join("\n"),
				"file.txt"
			)
		);
		const startLine3 = line1.length + line2.length + 2;
		const startLine6 =
			startLine3 + line3.length + line4.length + line5.length + 3;
		source.replace(
			startLine3,
			startLine3 + line3.length + line4.length + line5.length + 2,
			""
		);
		source.replace(1, 4, "i ");
		source.replace(1, 4, "bye");
		source.replace(7, 7, "0000");
		source.insert(line1.length + 2, "\n Multi Line\n");
		source.replace(startLine6 + 4, startLine6 + 4, " ");
		const originalSource = source.original();
		const originalText = originalSource.source();
		const resultText = source.source();
		const resultMap = source.sourceAndMap({
			columns: true
		});
		const resultListMap = source.sourceAndMap({
			columns: false
		});

		expect(originalSource).toEqual(source._source);
		expect(originalText).toBe(
			"Hello World!\n{}\nLine 3\nLine 4\nLine 5\nLast\nLine"
		);
		// const resultText = "Hi bye W0000rld!\n{\n Multi Line\n}\nLast Line";
		expect(resultText).toBe("Hi bye W0000rld!\n{\n Multi Line\n}\nLast Line");
		expect(resultMap.source).toEqual(resultText);
		expect(resultListMap.source).toEqual(resultText);
		expect(resultListMap.map.file).toEqual(resultMap.map.file);
		expect(resultListMap.map.version).toEqual(resultMap.map.version);
		expect(resultListMap.map.sources).toEqual(resultMap.map.sources);
		expect(resultListMap.map.sourcesContent).toEqual(
			resultMap.map.sourcesContent
		);
		expect(withReadableMappings(resultMap.map)._mappings)
			.toMatchInlineSnapshot(`
		"1:0 -> [file.txt] 1:0, :1 -> [file.txt] 1:1, :3 -> [file.txt] 1:5, :8 -> [file.txt] 1:7, :12 -> [file.txt] 1:8
		2:0 -> [file.txt] 2:0, :1 -> [file.txt] 2:1
		3:0 -> [file.txt] 2:1
		4:0 -> [file.txt] 2:1
		5:0 -> [file.txt] 6:0, :4 -> [file.txt] 6:4, :5 -> [file.txt] 7:0"
	`);
		expect(withReadableMappings(resultListMap.map)._mappings)
			.toMatchInlineSnapshot(`
		"1:0 -> [file.txt] 1:0
		2:0 -> [file.txt] 2:0
		3:0 -> [file.txt] 2:0
		4:0 -> [file.txt] 2:0
		5:0 -> [file.txt] 6:0"
	`);
	});

	it("should replace multiple items correctly", () => {
		let line1;
		const source = new ReplaceSource(
			new OriginalSource([(line1 = "Hello"), "World!"].join("\n"), "file.txt")
		);
		source.insert(0, "Message: ");
		source.replace(2, line1.length + 4, "y A");
		const resultText = source.source();
		const resultMap = source.sourceAndMap({
			columns: true
		});
		const resultListMap = source.sourceAndMap({
			columns: false
		});

		expect(resultText).toBe("Message: Hey Ad!");
		expect(resultMap.source).toEqual(resultText);
		expect(resultListMap.source).toEqual(resultText);
		expect(resultListMap.map.file).toEqual(resultMap.map.file);
		expect(resultListMap.map.version).toEqual(resultMap.map.version);
		expect(resultListMap.map.sources).toEqual(resultMap.map.sources);
		expect(resultListMap.map.sourcesContent).toEqual(
			resultMap.map.sourcesContent
		);
		expect(resultMap.map.mappings).toBe("AAAA,WAAE,GACE");
		expect(resultListMap.map.mappings).toBe("AAAA");
	});

	it("should prepend items correctly", () => {
		const source = new ReplaceSource(new OriginalSource("Line 1", "file.txt"));
		source.insert(-1, "Line -1\n");
		source.insert(-1, "Line 0\n");
		const resultText = source.source();
		const resultMap = source.sourceAndMap({
			columns: true
		});
		const resultListMap = source.sourceAndMap({
			columns: false
		});

		expect(resultText).toBe("Line -1\nLine 0\nLine 1");
		expect(resultMap.source).toEqual(resultText);
		expect(resultListMap.source).toEqual(resultText);
		expect(resultListMap.map.file).toEqual(resultMap.map.file);
		expect(resultListMap.map.version).toEqual(resultMap.map.version);
		expect(resultListMap.map.sources).toEqual(resultMap.map.sources);
		expect(resultListMap.map.sourcesContent).toEqual(
			resultMap.map.sourcesContent
		);
		expect(resultMap.map.mappings).toBe("AAAA;AAAA;AAAA");
		expect(resultListMap.map.mappings).toBe("AAAA;AAAA;AAAA");
	});

	it("should prepend items with replace at start correctly", () => {
		const source = new ReplaceSource(
			new OriginalSource(["Line 1", "Line 2"].join("\n"), "file.txt")
		);
		source.insert(-1, "Line 0\n");
		source.replace(0, 5, "Hello");
		const resultText = source.source();
		const resultMap = source.sourceAndMap({
			columns: true
		});
		const resultListMap = source.sourceAndMap({
			columns: false
		});

		expect(resultText).toBe("Line 0\nHello\nLine 2");
		expect(resultMap.source).toEqual(resultText);
		expect(resultListMap.source).toEqual(resultText);
		expect(resultListMap.map.file).toEqual(resultMap.map.file);
		expect(resultListMap.map.version).toEqual(resultMap.map.version);
		expect(resultListMap.map.sources).toEqual(resultMap.map.sources);
		expect(resultListMap.map.sourcesContent).toEqual(
			resultMap.map.sourcesContent
		);
		expect(resultMap.map.mappings).toBe("AAAA;AAAA,KAAM;AACN");
		expect(resultListMap.map.mappings).toBe("AAAA;AAAA;AACA");
	});

	it("should append items correctly", () => {
		let line1;
		const source = new ReplaceSource(
			new OriginalSource((line1 = "Line 1\n"), "file.txt")
		);
		source.insert(line1.length + 1, "Line 2\n");
		const resultText = source.source();
		const resultMap = source.sourceAndMap({
			columns: true
		});
		const resultListMap = source.sourceAndMap({
			columns: false
		});

		expect(resultText).toBe("Line 1\nLine 2\n");
		expect(resultMap.source).toEqual(resultText);
		expect(resultListMap.source).toEqual(resultText);
		expect(resultListMap.map.file).toEqual(resultMap.map.file);
		expect(resultListMap.map.version).toEqual(resultMap.map.version);
		expect(resultListMap.map.sources).toEqual(resultMap.map.sources);
		expect(resultListMap.map.sourcesContent).toEqual(
			resultMap.map.sourcesContent
		);
		expect(resultMap.map.mappings).toBe("AAAA");
		expect(resultListMap.map.mappings).toBe("AAAA");
	});

	it("should produce correct source map", () => {
		const bootstrapCode = "   var hello\n   var world\n";

		expect(function () {
			const source = new ReplaceSource(
				new OriginalSource(bootstrapCode, "file.js")
			);
			source.replace(7, 11, "h", "incorrect");
			source.replace(20, 24, "w", "identifiers");
			const resultMap = source.sourceAndMap();
			validate(resultMap.source, JSON.stringify(resultMap.map));
		}).toThrowError();

		const source = new ReplaceSource(
			new OriginalSource(bootstrapCode, "file.js")
		);
		source.replace(7, 11, "h", "hello");
		source.replace(20, 24, "w", "world");
		const resultMap = source.sourceAndMap();
		validate(resultMap.source, JSON.stringify(resultMap.map));
	});

	it("should allow replacements at the start", () => {
		const map = {
			version: 3,
			sources: ["abc"],
			names: ["StaticPage", "data", "foo"],
			mappings:
				";;AAAA,eAAe,SAASA,UAAT,OAA8B;AAAA,MAARC,IAAQ,QAARA,IAAQ;AAC3C,sBAAO;AAAA,cAAMA,IAAI,CAACC;AAAX,IAAP;AACD",
			/*
				3:0 -> [abc] 1:0, :15 -> [abc] 1:15, :24 -> [abc] 1:24 (StaticPage), :34 -> [abc] 1:15, :41 -> [abc] 1:45
				4:0 -> [abc] 1:45, :6 -> [abc] 1:37 (data), :10 -> [abc] 1:45, :18 -> [abc] 1:37 (data), :22 -> [abc] 1:45
				5:0 -> [abc] 2:2, :22 -> [abc] 2:9
				6:0 -> [abc] 2:9, :14 -> [abc] 2:15 (data), :18 -> [abc] 2:19, :19 -> [abc] 2:20 (foo)
				7:0 -> [abc] 2:9, :4 -> [abc] 2:2
				8:0 -> [abc] 3:1
			*/
			sourcesContent: [
				`export default function StaticPage({ data }) {
  return <div>{data.foo}</div>
}
`
			],
			file: "x"
		};
		const code = `import { jsx as _jsx } from "react/jsx-runtime";
export var __N_SSG = true;
export default function StaticPage(_ref) {
	var data = _ref.data;
	return /*#__PURE__*/_jsx("div", {
		children: data.foo
	});
}`;
		const source = new ReplaceSource(
			new SourceMapSource(code, "source.js", map)
		);
		source.replace(0, 47, "");
		source.replace(49, 55, "");
		source.replace(76, 90, "");
		source.replace(
			165,
			168,
			"(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)"
		);
		expect(withReadableMappings(source.map())).toMatchInlineSnapshot(`
		Object {
		  "_mappings": "3:0 -> [abc] 1:15, :9 -> [abc] 1:24 (StaticPage), :19 -> [abc] 1:15, :26 -> [abc] 1:45
		4:0 -> [abc] 1:45, :6 -> [abc] 1:37 (data), :10 -> [abc] 1:45, :18 -> [abc] 1:37 (data), :22 -> [abc] 1:45
		5:0 -> [abc] 2:2, :22 -> [abc] 2:9
		6:0 -> [abc] 2:9, :14 -> [abc] 2:15 (data), :18 -> [abc] 2:19, :19 -> [abc] 2:20 (foo)
		7:0 -> [abc] 2:9, :4 -> [abc] 2:2
		8:0 -> [abc] 3:1",
		  "file": "x",
		  "mappings": ";;AAAe,SAASA,UAAT,OAA8B;AAAA,MAARC,IAAQ,QAARA,IAAQ;AAC3C,sBAAO;AAAA,cAAMA,IAAI,CAACC;AAAX,IAAP;AACD",
		  "names": Array [
		    "StaticPage",
		    "data",
		    "foo",
		  ],
		  "sources": Array [
		    "abc",
		  ],
		  "sourcesContent": Array [
		    "export default function StaticPage({ data }) {
		  return <div>{data.foo}</div>
		}
		",
		  ],
		  "version": 3,
		}
	`);
	});

	it("should not generate invalid mappings when replacing mulitple lines of code", () => {
		const source = new ReplaceSource(
			new OriginalSource(
				["if (a;b;c) {", "  a; b; c;", "}"].join("\n"),
				"document.js"
			),
			"_document.js"
		);
		source.replace(4, 8, "false");
		source.replace(12, 23, "");
		expect(source.source()).toMatchInlineSnapshot(`"if (false) {}"`);
		expect(withReadableMappings(source.map(), source.source()))
			.toMatchInlineSnapshot(`
		Object {
		  "_mappings": "1:0 -> [document.js] 1:0, :4 -> [document.js] 1:4, :9 -> [document.js] 1:9, :12 -> [document.js] 3:0
		if (false) {}
		^___^____^__^
		",
		  "file": "x",
		  "mappings": "AAAA,IAAI,KAAK,GAET",
		  "names": Array [],
		  "sources": Array [
		    "document.js",
		  ],
		  "sourcesContent": Array [
		    "if (a;b;c) {
		  a; b; c;
		}",
		  ],
		  "version": 3,
		}
	`);
	});
});
