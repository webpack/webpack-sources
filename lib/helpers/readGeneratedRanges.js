/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { readTokens, NEXT_LINE } = require("./vlq");

/** @typedef {import("../Source").OnGeneratedRange} OnGeneratedRange */

const HAS_DEFINITION_FLAG = 1;
const HAS_CALLSITE_FLAG = 2;

/**
 * @param {string} generatedRanges the generated ranges string
 * @param {OnGeneratedRange} onGeneratedRange called for each generated range
 * @returns {void}
 */
const readGeneratedRanges = (generatedRanges, onGeneratedRange) => {
	if (typeof generatedRanges !== "string") return;
	let currentDataPos = 0;
	let generatedLine = 1;
	let generatedColumn = 0;
	let flags = -1;
	let definition = [0, 0];
	let callsite = [0, 0, 0];
	let bindings = [];
	let remainingSubranges = 0;
	let currentSubrangeLine = 0;
	let currentSubrangeColumn = 0;
	readTokens(generatedRanges, (control, value) => {
		if (control === 0) {
			switch (currentDataPos) {
				case 0: // column in the generated code
					generatedColumn += value;
					currentDataPos++;
					break;
				case 1: // flags
					flags = value;
					currentDataPos++;
					break;
				case 2: // definition source index
					if ((flags & HAS_DEFINITION_FLAG) !== 0) {
						definition[0] += value;
						if (value !== 0) {
							definition[1] = 0;
						}
						currentDataPos = 3;
						break;
					}
				/* fall through */
				case 3: // definition scope offset
					if ((flags & HAS_DEFINITION_FLAG) !== 0) {
						definition[1] += value;
						currentDataPos = 4;
						break;
					}
				/* fall through */
				case 4: // callsite source index
					if ((flags & HAS_CALLSITE_FLAG) !== 0) {
						callsite[0] += value;
						if (value !== 0) {
							callsite[1] = 0;
							callsite[2] = 0;
						}
						currentDataPos = 5;
						break;
					}
				/* fall through */
				case 5: // callsite line
					if ((flags & HAS_CALLSITE_FLAG) !== 0) {
						callsite[1] += value;
						if (value !== 0) {
							callsite[2] = 0;
						}
						currentDataPos = 6;
						break;
					}
				/* fall through */
				case 6: // callsite column
					if ((flags & HAS_CALLSITE_FLAG) !== 0) {
						callsite[2] += value;
						currentDataPos = 7;
						break;
					}
				/* fall through */
				case 7: // bindings (start)
					bindings.push([value]);
					currentDataPos = 8;
					break;
				case 8: // bindings (potentially continuation)
					if (value >= 0) {
						bindings.push([value]);
						currentDataPos = 8;
					} else {
						remainingSubranges = -value;
						currentDataPos = 9;
					}
					break;
				case 9: // bindings (subrange line)
					bindings[bindings.length - 1].push(value - currentSubrangeLine);
					if (currentSubrangeLine !== value) {
						currentSubrangeLine = value;
						currentSubrangeColumn = 0;
					}
					currentDataPos++;
					break;
				case 10: // bindings (subrange column)
					bindings[bindings.length - 1].push(value - currentSubrangeColumn);
					currentSubrangeColumn = value;
					currentDataPos++;
					break;
				case 11: // bindings (expression)
					bindings[bindings.length - 1].push(value);
					if (--remainingSubranges === 0) {
						currentDataPos = 7;
					} else {
						currentDataPos = 9;
					}
					break;
			}
		} else {
			if (currentDataPos === 1) {
				// end of segment
				onGeneratedRange(
					generatedLine,
					generatedColumn,
					-1,
					undefined,
					undefined,
					undefined
				);
				currentDataPos = 0;
				flags = 0;
				bindings.length = 0;
			} else if (currentDataPos > 0) {
				onGeneratedRange(
					generatedLine,
					generatedColumn,
					flags,
					flags & HAS_DEFINITION_FLAG ? definition : undefined,
					flags & HAS_CALLSITE_FLAG ? callsite : undefined,
					bindings
				);
				currentDataPos = 0;
				flags = 0;
				bindings.length = 0;
			}
			if (control === NEXT_LINE) {
				// Start new line
				generatedLine++;
				generatedColumn = 0;
			}
		}
	});
	if (currentDataPos === 1) {
		// end of segment
		onGeneratedRange(
			generatedLine,
			generatedColumn,
			-1,
			undefined,
			undefined,
			undefined
		);
	} else if (currentDataPos > 0) {
		onGeneratedRange(
			generatedLine,
			generatedColumn,
			flags,
			flags & HAS_DEFINITION_FLAG ? definition : undefined,
			flags & HAS_CALLSITE_FLAG ? callsite : undefined,
			bindings
		);
		currentDataPos = 0;
		flags = 0;
		bindings.length = 0;
	}
};

module.exports = readGeneratedRanges;
