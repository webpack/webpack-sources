"use strict";

// Loaded before every test file (`--require` for `node --test`, `setupFiles`
// for Jest): every mapping the library writes is checked, so a stream that
// reports mappings out of order or with invalid fields fails the test that
// produced it instead of silently yielding a broken `mappings` string.
//
// The library takes `createMappingsWriter` from this module when it loads, so
// replacing the export here, before any library file is required, puts the
// check in front of every writer.

const mappingsSerializer = require("../../lib/helpers/createMappingsSerializer");

const { createMappingsWriter } = mappingsSerializer;

/**
 * @param {Parameters<typeof createMappingsWriter>[0]} options options
 * @returns {ReturnType<typeof createMappingsWriter>} writer that validates each mapping
 */
mappingsSerializer.createMappingsWriter = (options) => {
	const writer = createMappingsWriter(options);
	const { add } = writer;
	let lastLine = 1;
	let lastColumn = -1;
	writer.add = (
		generatedLine,
		generatedColumn,
		sourceIndex,
		originalLine,
		originalColumn,
		nameIndex,
	) => {
		if (
			generatedLine >= lastLine &&
			generatedColumn > (generatedLine === lastLine ? lastColumn : -1) &&
			(sourceIndex === -1
				? originalLine === -1 && originalColumn === -1 && nameIndex === -1
				: sourceIndex >= 0 &&
					originalLine >= 1 &&
					originalColumn >= 0 &&
					nameIndex >= -1)
		) {
			lastLine = generatedLine;
			lastColumn = generatedColumn;
			return add(
				generatedLine,
				generatedColumn,
				sourceIndex,
				originalLine,
				originalColumn,
				nameIndex,
			);
		}
		throw new Error(`Invalid mapping passed to the mappings writer:
generatedLine = ${generatedLine} (lastLine = ${lastLine}),
generatedColumn = ${generatedColumn} (lastColumn = ${lastColumn}),
sourceIndex = ${sourceIndex},
originalLine = ${originalLine},
originalColumn = ${originalColumn},
nameIndex = ${nameIndex}`);
	};
	return writer;
};
