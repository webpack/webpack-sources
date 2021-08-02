const readMappings = require("../lib/helpers/readMappings");

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

exports.withReadableMappings = (sourceMap, generatedCode) => {
	if (!sourceMap) return sourceMap;
	if (sourceMap.map) {
		return Object.assign({}, sourceMap, {
			_mappings: exports.readableMappings(
				sourceMap.map.mappings,
				sourceMap.map.sources,
				sourceMap.map.names,
				sourceMap.source
			)
		});
	} else {
		return Object.assign({}, sourceMap, {
			_mappings: exports.readableMappings(
				sourceMap.mappings,
				sourceMap.sources,
				sourceMap.names,
				generatedCode
			)
		});
	}
};

describe("helpers", () => {
	it("only helpers", () => {});
});
