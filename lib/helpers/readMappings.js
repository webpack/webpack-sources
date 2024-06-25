/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { NEXT_LINE, readTokens } = require("./vlq");

/**
 * @param {string} mappings the mappings string
 * @param {function(number, number, number, number, number, number): void} onMapping called for each mapping
 * @returns {void}
 */
const readMappings = (mappings, onMapping) => {
	// generatedColumn, [sourceIndex, originalLine, orignalColumn, [nameIndex]]
	const currentData = new Uint32Array([0, 0, 1, 0, 0]);
	let currentDataPos = 0;
	let generatedLine = 1;
	let generatedColumn = -1;
	readTokens(mappings, (control, value) => {
		if (control === 0) {
			currentData[currentDataPos++] += value;
		} else {
			// End current segment
			if (currentData[0] > generatedColumn) {
				if (currentDataPos === 1) {
					onMapping(generatedLine, currentData[0], -1, -1, -1, -1);
				} else if (currentDataPos === 4) {
					onMapping(
						generatedLine,
						currentData[0],
						currentData[1],
						currentData[2],
						currentData[3],
						-1
					);
				} else if (currentDataPos === 5) {
					onMapping(
						generatedLine,
						currentData[0],
						currentData[1],
						currentData[2],
						currentData[3],
						currentData[4]
					);
				}
				generatedColumn = currentData[0];
			}
			currentDataPos = 0;
			if (control === NEXT_LINE) {
				// Start new line
				generatedLine++;
				currentData[0] = 0;
				generatedColumn = -1;
			}
		}
	});
	// End current segment
	if (currentDataPos === 1) {
		onMapping(generatedLine, currentData[0], -1, -1, -1, -1);
	} else if (currentDataPos === 4) {
		onMapping(
			generatedLine,
			currentData[0],
			currentData[1],
			currentData[2],
			currentData[3],
			-1
		);
	} else if (currentDataPos === 5) {
		onMapping(
			generatedLine,
			currentData[0],
			currentData[1],
			currentData[2],
			currentData[3],
			currentData[4]
		);
	}
};

module.exports = readMappings;
