/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ALPHABET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const CONTINUATION_BIT = 0x20;
const END_SEGMENT_BIT = 0x40;
const NEXT_LINE = END_SEGMENT_BIT | 0x01;
const INVALID = END_SEGMENT_BIT | 0x02;
const DATA_MASK = 0x1f;

const ccToValue = new Uint8Array("z".charCodeAt(0) + 1);
{
	ccToValue.fill(INVALID);
	for (let i = 0; i < ALPHABET.length; i++) {
		ccToValue[ALPHABET.charCodeAt(i)] = i;
	}
	ccToValue[",".charCodeAt(0)] = END_SEGMENT_BIT;
	ccToValue[";".charCodeAt(0)] = NEXT_LINE;
}
const ccMax = ccToValue.length - 1;

/**
 * @param {string} mappings the mappings string
 * @returns {void}
 */
const createMappingsIterator = mappings => {
	// generatedColumn, [sourceIndex, originalLine, orignalColumn, [nameIndex]]
	const currentData = new Uint32Array([0, 0, 1, 0, 0]);
	let currentDataPos = 0;
	// currentValue will include a sign bit at bit 0
	let currentValue = 0;
	let currentValuePos = 0;
	let i = 0;
	const it = {
		generatedLine: 1,
		generatedColumn: -1,
		sourceIndex: -1,
		originalLine: -1,
		originalColumn: -1,
		nameIndex: -1,
		next() {
			if (i === -1) return false;
			for (; i < mappings.length; i++) {
				const cc = mappings.charCodeAt(i);
				if (cc > ccMax) continue;
				const value = ccToValue[cc];
				if ((value & END_SEGMENT_BIT) !== 0) {
					// End current segment
					if (currentDataPos === 1) {
						this.generatedColumn = currentData[0];
						this.sourceIndex = -1;
						this.originalLine = -1;
						this.originalColumn = -1;
						this.nameIndex = -1;
						currentDataPos = 0;
						return true;
					} else if (currentDataPos === 4) {
						this.generatedColumn = currentData[0];
						this.sourceIndex = currentData[1];
						this.originalLine = currentData[2];
						this.originalColumn = currentData[3];
						this.nameIndex = -1;
						currentDataPos = 0;
						return true;
					} else if (currentDataPos === 5) {
						this.generatedColumn = currentData[0];
						this.sourceIndex = currentData[1];
						this.originalLine = currentData[2];
						this.originalColumn = currentData[3];
						this.nameIndex = currentData[4];
						currentDataPos = 0;
						return true;
					}
					if (value === NEXT_LINE) {
						// Start new line
						this.generatedLine++;
						currentData[0] = 0;
					}
				} else if ((value & CONTINUATION_BIT) === 0) {
					// last sextet
					currentValue |= value << currentValuePos;
					const finalValue =
						currentValue & 1 ? -(currentValue >> 1) : currentValue >> 1;
					currentData[currentDataPos++] += finalValue;
					currentValuePos = 0;
					currentValue = 0;
				} else {
					currentValue |= (value & DATA_MASK) << currentValuePos;
					currentValuePos += 5;
				}
			}
			// End current segment
			if (currentDataPos === 1) {
				this.generatedColumn = currentData[0];
				this.sourceIndex = -1;
				this.originalLine = -1;
				this.originalColumn = -1;
				this.nameIndex = -1;
				i = -1;
				return true;
			} else if (currentDataPos === 4) {
				this.generatedColumn = currentData[0];
				this.sourceIndex = currentData[1];
				this.originalLine = currentData[2];
				this.originalColumn = currentData[3];
				this.nameIndex = -1;
				i = -1;
				return true;
			} else if (currentDataPos === 5) {
				this.generatedColumn = currentData[0];
				this.sourceIndex = currentData[1];
				this.originalLine = currentData[2];
				this.originalColumn = currentData[3];
				this.nameIndex = currentData[4];
				i = -1;
				return true;
			}
			i = -1;
			return false;
		}
	};
	return it;
};

module.exports = createMappingsIterator;
