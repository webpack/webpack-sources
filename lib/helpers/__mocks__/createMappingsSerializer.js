/* global jest */

const createMappingsSerializer = jest.requireActual(
	"../createMappingsSerializer"
);

module.exports = options => {
	const fn = createMappingsSerializer(options);
	return (
		generatedLine,
		generatedColumn,
		sourceIndex,
		originalLine,
		originalColumn,
		nameIndex
	) => {
		if (
			generatedLine >= 1 &&
			generatedColumn >= 0 &&
			(sourceIndex === -1
				? originalLine === -1 && originalColumn === -1 && nameIndex === -1
				: sourceIndex >= 0 &&
				  originalLine >= 1 &&
				  originalColumn >= 0 &&
				  nameIndex >= -1)
		)
			return fn(
				generatedLine,
				generatedColumn,
				sourceIndex,
				originalLine,
				originalColumn,
				nameIndex
			);
		throw new Error(`Invalid mapping passed to mapping serializer:
generatedLine = ${generatedLine},
generatedColumn = ${generatedColumn},
sourceIndex = ${sourceIndex},
originalLine = ${originalLine},
originalColumn = ${originalColumn},
nameIndex = ${nameIndex}`);
	};
};
