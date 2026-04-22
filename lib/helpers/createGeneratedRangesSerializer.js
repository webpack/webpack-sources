/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { valueAsToken } = require("./vlq");

/**
 * @callback GeneratedRangesSerializer
 * @param {number} generatedLine generated line
 * @param {number} generatedColumn generated column
 * @param {number} flags flags (>= 0 for start, -1 for end)
 * @param {[number, number] | undefined} definition definition
 * @param {[number, number, number] | undefined} callsite callsite
 * @param {number[][] | undefined} bindings bindings
 * @returns {string} result
 */

/**
 * @returns {GeneratedRangesSerializer} generated-ranges serializer
 */
const createGeneratedRangesSerializer = () => {
	let initial = true;
	let currentLine = 1;
	let currentColumn = 0;
	let currentDefinitionSource = 0;
	let currentDefinitionScope = 0;
	let currentCallsiteSource = 0;
	let currentCallsiteLine = 0;
	let currentCallsiteColumn = 0;
	return (
		generatedLine,
		generatedColumn,
		flags,
		definition,
		callsite,
		bindings,
	) => {
		let str;
		if (currentLine < generatedLine) {
			str = ";".repeat(generatedLine - currentLine);
			currentLine = generatedLine;
			currentColumn = 0;
			initial = false;
		} else if (initial) {
			str = "";
			initial = false;
		} else {
			str = ",";
		}
		str += valueAsToken(generatedColumn - currentColumn);
		currentColumn = generatedColumn;

		if (flags >= 0) {
			str += valueAsToken(flags);

			if (definition !== undefined) {
				const [defSource, defScope] = definition;
				str += valueAsToken(defSource - currentDefinitionSource);
				if (defSource !== currentDefinitionSource) {
					currentDefinitionSource = defSource;
					currentDefinitionScope = 0;
				}
				str += valueAsToken(defScope - currentDefinitionScope);
				currentDefinitionScope = defScope;
			}

			if (callsite !== undefined) {
				const [csSource, csLine, csColumn] = callsite;
				str += valueAsToken(csSource - currentCallsiteSource);
				if (csSource !== currentCallsiteSource) {
					currentCallsiteSource = csSource;
					currentCallsiteLine = 0;
					currentCallsiteColumn = 0;
				}
				str += valueAsToken(csLine - currentCallsiteLine);
				if (csLine !== currentCallsiteLine) {
					currentCallsiteLine = csLine;
					currentCallsiteColumn = 0;
				}
				str += valueAsToken(csColumn - currentCallsiteColumn);
				currentCallsiteColumn = csColumn;
			}

			if (bindings) {
				for (const binding of bindings) {
					str += valueAsToken(binding[0]);
					if (binding.length > 1) {
						str += valueAsToken(-binding.length);
						for (let i = 1; i < binding.length; i++) {
							str += valueAsToken(binding[i]);
						}
					}
				}
			}
		}
		return str;
	};
};

module.exports = createGeneratedRangesSerializer;
