const readMappings = require("../lib/helpers/readMappings");

exports.readableMappings = (mappings, sources, names) => {
	const output = [];
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
			let str = `${generatedLine}:${generatedColumn}`;
			if (sourceIndex >= 0) {
				str += ` -> [${
					sources ? sources[sourceIndex] : sourceIndex
				}] ${originalLine}:${originalColumn}`;
			}
			if (nameIndex >= 0) {
				str += ` (${names ? names[nameIndex] : nameIndex})`;
			}
			output.push(str);
		}
	);
	return output.join(", ");
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
