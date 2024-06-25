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

/** @typedef {0 | NEXT_LINE | END_SEGMENT_BIT | INVALID} Control */

/**
 * @param {string} string the input string
 * @param {function(control: Control, data: number): void} onToken called for each token
 * @returns {void}
 */
const readTokens = (string, onToken) => {
	// currentValue will include a sign bit at bit 0
	let currentValue = 0;
	let currentValuePos = 0;
	for (let i = 0; i < string.length; i++) {
		const cc = string.charCodeAt(i);
		if (cc > ccMax) continue;
		const value = ccToValue[cc];
		if ((value & END_SEGMENT_BIT) !== 0) {
			onToken(value, 0);
		} else if ((value & CONTINUATION_BIT) === 0) {
			// last sextet
			currentValue |= value << currentValuePos;
			const finalValue =
				currentValue & 1 ? -(currentValue >> 1) : currentValue >> 1;
			onToken(0, finalValue);
			currentValuePos = 0;
			currentValue = 0;
		} else {
			currentValue |= (value & DATA_MASK) << currentValuePos;
			currentValuePos += 5;
		}
	}
};

const valueAsToken = value => {
	let str = "";
	const sign = (value >>> 31) & 1;
	const mask = value >> 31;
	const absValue = (value + mask) ^ mask;
	let data = (absValue << 1) | sign;
	for (;;) {
		const sextet = data & 0x1f;
		data >>= 5;
		if (data === 0) {
			str += ALPHABET[sextet];
			break;
		} else {
			str += ALPHABET[sextet | CONTINUATION_BIT];
		}
	}
	return str;
};

module.exports = {
	readTokens,
	END_SEGMENT: END_SEGMENT_BIT,
	NEXT_LINE,
	INVALID,
	valueAsToken
};
