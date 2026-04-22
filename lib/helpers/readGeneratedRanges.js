/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { NEXT_LINE, readTokens } = require("./vlq");

/** @typedef {import("../Source").OnGeneratedRange} OnGeneratedRange */

const HAS_DEFINITION_FLAG = 1;
const HAS_CALLSITE_FLAG = 2;

/**
 * Decode the `generatedRanges` string from the Source Map Scopes Proposal and
 * emit each range via `onGeneratedRange`. Unknown/empty input is ignored.
 * @param {string | undefined} generatedRanges the generated ranges string
 * @param {OnGeneratedRange} onGeneratedRange called for each generated range
 * @returns {void}
 */
const readGeneratedRanges = (generatedRanges, onGeneratedRange) => {
	if (typeof generatedRanges !== "string") return;
	let currentDataPos = 0;
	let generatedLine = 1;
	let generatedColumn = 0;
	let flags = -1;
	/** @type {[number, number]} */
	const definition = [0, 0];
	/** @type {[number, number, number]} */
	const callsite = [0, 0, 0];
	/** @type {number[][]} */
	const bindings = [];
	let remainingSubranges = 0;
	let currentSubrangeLine = 0;
	let currentSubrangeColumn = 0;
	readTokens(generatedRanges, (control, value) => {
		if (control === 0) {
			switch (currentDataPos) {
				case 0:
					generatedColumn += value;
					currentDataPos++;
					break;
				case 1:
					flags = value;
					currentDataPos++;
					break;
				case 2:
					if ((flags & HAS_DEFINITION_FLAG) !== 0) {
						definition[0] += value;
						if (value !== 0) {
							definition[1] = 0;
						}
						currentDataPos = 3;
						break;
					}
				/* falls through */
				case 3:
					if ((flags & HAS_DEFINITION_FLAG) !== 0) {
						definition[1] += value;
						currentDataPos = 4;
						break;
					}
				/* falls through */
				case 4:
					if ((flags & HAS_CALLSITE_FLAG) !== 0) {
						callsite[0] += value;
						if (value !== 0) {
							callsite[1] = 0;
							callsite[2] = 0;
						}
						currentDataPos = 5;
						break;
					}
				/* falls through */
				case 5:
					if ((flags & HAS_CALLSITE_FLAG) !== 0) {
						callsite[1] += value;
						if (value !== 0) {
							callsite[2] = 0;
						}
						currentDataPos = 6;
						break;
					}
				/* falls through */
				case 6:
					if ((flags & HAS_CALLSITE_FLAG) !== 0) {
						callsite[2] += value;
						currentDataPos = 7;
						break;
					}
				/* falls through */
				case 7:
					bindings.push([value]);
					currentDataPos = 8;
					break;
				case 8:
					if (value >= 0) {
						bindings.push([value]);
						currentDataPos = 8;
					} else {
						remainingSubranges = -value;
						currentDataPos = 9;
					}
					break;
				case 9:
					bindings[bindings.length - 1].push(value - currentSubrangeLine);
					if (currentSubrangeLine !== value) {
						currentSubrangeLine = value;
						currentSubrangeColumn = 0;
					}
					currentDataPos++;
					break;
				case 10:
					bindings[bindings.length - 1].push(value - currentSubrangeColumn);
					currentSubrangeColumn = value;
					currentDataPos++;
					break;
				case 11:
					bindings[bindings.length - 1].push(value);
					currentDataPos = --remainingSubranges === 0 ? 7 : 9;
					break;
				default:
					break;
			}
		} else {
			if (currentDataPos === 1) {
				onGeneratedRange(
					generatedLine,
					generatedColumn,
					-1,
					undefined,
					undefined,
					undefined,
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
					bindings,
				);
				currentDataPos = 0;
				flags = 0;
				bindings.length = 0;
			}
			if (control === NEXT_LINE) {
				generatedLine++;
				generatedColumn = 0;
			}
		}
	});
	if (currentDataPos === 1) {
		onGeneratedRange(
			generatedLine,
			generatedColumn,
			-1,
			undefined,
			undefined,
			undefined,
		);
	} else if (currentDataPos > 0) {
		onGeneratedRange(
			generatedLine,
			generatedColumn,
			flags,
			flags & HAS_DEFINITION_FLAG ? definition : undefined,
			flags & HAS_CALLSITE_FLAG ? callsite : undefined,
			bindings,
		);
	}
};

module.exports = readGeneratedRanges;
module.exports.HAS_CALLSITE_FLAG = HAS_CALLSITE_FLAG;
module.exports.HAS_DEFINITION_FLAG = HAS_DEFINITION_FLAG;
