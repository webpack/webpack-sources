const readGeneratedRanges = require("../lib/helpers/readGeneratedRanges");
const readMappings = require("../lib/helpers/readMappings");
const readOriginalScopes = require("../lib/helpers/readOriginalScopes");

exports.readableMappings = (mappings, sources, names, generatedCode) => {
	let str = "";
	let bufferedGeneratedAnnotation = "";
	let currentLine = 1;
	let currentColumn = 0;
	let currentColumnMapped = false;
	let first = true;
	const lines = generatedCode ? generatedCode.split("\n") : [];
	readMappings(
		mappings,
		(
			generatedLine,
			generatedColumn,
			sourceIndex,
			originalLine,
			originalColumn,
			nameIndex
		) => {
			if (first) {
				first = false;
				str += `${generatedLine}`;
			} else {
				if (currentLine === generatedLine) {
					str += ", ";
				} else {
					str += "\n";
					if (currentLine - 1 < lines.length) {
						const line = lines[currentLine - 1];
						if (line.length > currentColumn) {
							bufferedGeneratedAnnotation += currentColumnMapped
								? "^" + "_".repeat(line.length - currentColumn - 1)
								: ".".repeat(line.length - currentColumn);
						}
						if (bufferedGeneratedAnnotation) {
							str += `${line}\n${bufferedGeneratedAnnotation}\n`;
							bufferedGeneratedAnnotation = "";
						}
					}
					str += `${generatedLine}`;
					currentColumn = 0;
					currentColumnMapped = false;
				}
			}
			currentLine = generatedLine;
			str += `:${generatedColumn}`;
			if (sourceIndex >= 0) {
				str += ` -> [${
					sources ? sources[sourceIndex] : sourceIndex
				}] ${originalLine}:${originalColumn}`;
			}
			if (nameIndex >= 0) {
				str += ` (${names ? names[nameIndex] : nameIndex})`;
			}
			if (generatedLine - 1 < lines.length && generatedColumn > currentColumn) {
				const line = lines[generatedLine - 1];
				if (generatedColumn > line.length) {
					bufferedGeneratedAnnotation += "^... OUT OF LINE";
				} else {
					bufferedGeneratedAnnotation += currentColumnMapped
						? "^" + "_".repeat(generatedColumn - currentColumn - 1)
						: ".".repeat(generatedColumn - currentColumn);
				}
			}
			currentColumn = generatedColumn;
			currentColumnMapped = sourceIndex >= 0;
		}
	);
	if (currentLine - 1 < lines.length) {
		const line = lines[currentLine - 1];
		if (line.length > currentColumn) {
			bufferedGeneratedAnnotation += currentColumnMapped
				? "^" + "_".repeat(line.length - currentColumn - 1)
				: ".".repeat(line.length - currentColumn);
		}
		if (bufferedGeneratedAnnotation) {
			str += `\n${line}\n${bufferedGeneratedAnnotation}\n`;
			bufferedGeneratedAnnotation = "";
		}
	}
	return str;
};

const readableOriginalScopes = (originalScopes, names) => {
	return originalScopes.map(originalScopes => {
		let readable = [];
		let indent = 0;
		readOriginalScopes(
			0,
			originalScopes,
			(sourceIndex, line, column, flags, kind, name, variables) => {
				if (flags >= 0) {
					let str = `${"  ".repeat(indent)}${line}:${column} ${kind}`;
					if (name >= 0) {
						str += ` ${names[name]}`;
					}
					if (variables) {
						const vars = variables.map(v => names[v]);
						if (vars.length > 0) {
							str += ` (${vars.join(", ")})`;
						}
					}
					str += " {";
					readable.push(str);
					indent++;
				} else {
					if (indent > 0) indent--;
					if (
						readable.length > 0 &&
						readable[readable.length - 1].endsWith("{")
					) {
						readable[readable.length - 1] = `${readable[
							readable.length - 1
						].slice(0, -1)}until ${line}:${column}`;
					} else {
						readable.push(`${"  ".repeat(indent)}} at ${line}:${column}`);
					}
				}
			}
		);
		return readable.join("\n");
	});
};

const readableGeneratedRanges = (generatedRanges, names) => {
	let str = "";
	let currentLine = -1;
	let indent = 0;
	readGeneratedRanges(
		generatedRanges,
		(generatedLine, generatedColumn, flags, definition, callsite, bindings) => {
			if (flags >= 0) {
				str += `${"  ".repeat(indent)}`;
				indent++;
				if (currentLine !== generatedLine) {
					str += `${generatedLine}`;
					currentLine = generatedLine;
				}
				str += `:${generatedColumn}`;
				if (definition) {
					str += ` -> ${definition[0]}:${definition[1]}`;
				}
				if (callsite) {
					str += ` at ${callsite[0]}:${callsite[1]}:${callsite[2]}`;
				}
				if (bindings) {
					str += ` (${bindings
						.map(bindings => {
							let str = names[bindings[0]];
							if (bindings.length === 1) return str;
							for (let i = 1; i < bindings.length; i += 3) {
								str += ` [${bindings[i]}:${bindings[i + 1]}] ${
									names[bindings[i + 2]]
								}`;
							}
							return str;
						})
						.join(", ")})`;
				}
				str += " {\n";
			} else {
				if (indent > 0) indent--;
				str += `${"  ".repeat(indent)}} at `;
				if (currentLine !== generatedLine) {
					str += `${generatedLine}`;
					currentLine = generatedLine;
				}
				str += `:${generatedColumn}\n`;
			}
		}
	);
	return str;
};

exports.withReadableMappings = (sourceMap, generatedCode) => {
	if (!sourceMap) return sourceMap;
	if (sourceMap.map) {
		return Object.assign(
			{},
			sourceMap,
			{
				_mappings: exports.readableMappings(
					sourceMap.map.mappings,
					sourceMap.map.sources,
					sourceMap.map.names,
					sourceMap.source
				)
			},
			sourceMap.map.originalScopes
				? {
						_originalScopes: readableOriginalScopes(
							sourceMap.map.originalScopes,
							sourceMap.names
						)
				  }
				: {},
			sourceMap.map.generatedRanges
				? {
						_generatedRanges: readableGeneratedRanges(
							sourceMap.map.generatedRanges,
							sourceMap.names
						)
				  }
				: {}
		);
	} else {
		return Object.assign(
			{},
			sourceMap,
			{
				_mappings: exports.readableMappings(
					sourceMap.mappings,
					sourceMap.sources,
					sourceMap.names,
					generatedCode
				)
			},
			sourceMap.originalScopes
				? {
						_originalScopes: readableOriginalScopes(
							sourceMap.originalScopes,
							sourceMap.names
						)
				  }
				: {},
			sourceMap.generatedRanges
				? {
						_generatedRanges: readableGeneratedRanges(
							sourceMap.generatedRanges,
							sourceMap.names
						)
				  }
				: {}
		);
	}
};

describe("helpers", () => {
	it("format originalScopes", () => {
		let out = readableOriginalScopes(
			["AAAAAC,CCCCAEC,CA,CA"],
			["hello", "world", "hey"]
		);
		expect(out).toMatchInlineSnapshot(`
		Array [
		  "1:0 0 (hello, world) {
		  2:1 1 hello (hey, world) until 3:0
		} at 4:0",
		]
	`);
	});

	it("format generatedRanges", () => {
		let out = readableGeneratedRanges("AA,CCA;CAACEDCCG,E;C;C", [
			"123",
			"world()",
			"111",
			"222"
		]);
		expect(out).toMatchInlineSnapshot(`
		"1:0 () {
		  :1 -> 0:0 () {
		    2:1 (123, world(), 111 [1:1] 222) {
		    } at :3
		  } at 3:1
		} at 4:1
		"
	`);
	});

	it("format generatedRanges 2", () => {
		let out = readableGeneratedRanges("C;ACAE,C", ["A", "B", "C", "D"]);
		expect(out).toMatchInlineSnapshot(`
		"} at 1:1
		2:0 -> 0:2 () {
		} at :1
		"
	`);
	});
});
