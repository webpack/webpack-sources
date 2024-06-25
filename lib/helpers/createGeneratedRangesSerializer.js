/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { valueAsToken } = require("./vlq");

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
		bindings
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
				str += valueAsToken(definition[0] - currentDefinitionSource);
				if (definition[0] !== currentDefinitionSource) {
					currentDefinitionSource = definition[0];
					currentDefinitionScope = 0;
				}
				str += valueAsToken(definition[1] - currentDefinitionScope);
				currentDefinitionScope = definition[1];
			}

			if (callsite !== undefined) {
				str += valueAsToken(callsite[0] - currentCallsiteSource);
				if (callsite[0] !== currentCallsiteSource) {
					currentCallsiteSource = callsite[0];
					currentCallsiteLine = 0;
					currentCallsiteColumn = 0;
				}
				str += valueAsToken(callsite[1] - currentCallsiteLine);
				if (callsite[1] !== currentCallsiteLine) {
					currentCallsiteLine = callsite[1];
					currentCallsiteColumn = 0;
				}
				str += valueAsToken(callsite[2] - currentCallsiteColumn);
				currentCallsiteColumn = callsite[2];
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
