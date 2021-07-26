const readMappings = require("../lib/helpers/readMappings");

exports.readableMappings = (mappings, sources, names) => {
	let str = "";
	let currentLine = 1;
	let first = true;
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
				str += currentLine === generatedLine ? ", " : `\n${generatedLine}`;
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
		}
	);
	return str;
};

exports.withReadableMappings = sourceMap => {
	return (
		sourceMap &&
		Object.assign({}, sourceMap, {
			_mappings: exports.readableMappings(
				sourceMap.mappings,
				sourceMap.sources,
				sourceMap.names
			)
		})
	);
};

describe("helpers", () => {
	it("only helpers", () => {});
});
