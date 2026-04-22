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
ccToValue.fill(INVALID);
for (let i = 0; i < ALPHABET.length; i++) {
	ccToValue[ALPHABET.charCodeAt(i)] = i;
}
ccToValue[",".charCodeAt(0)] = END_SEGMENT_BIT;
ccToValue[";".charCodeAt(0)] = NEXT_LINE;

const ccMax = ccToValue.length - 1;

const ALPHABET_CHARS = [...ALPHABET];

/** @typedef {(control: number, data: number) => void} OnToken */

/**
 * Read VLQ-encoded tokens from `string`. `onToken` is called with `control=0`
 * for each decoded signed integer, `control=END_SEGMENT` on `,`, and
 * `control=NEXT_LINE` on `;`.
 * @param {string} string the input string
 * @param {OnToken} onToken called for each token
 * @returns {void}
 */
const readTokens = (string, onToken) => {
	let currentValue = 0;
	let currentValuePos = 0;
	for (let i = 0; i < string.length; i++) {
		const cc = string.charCodeAt(i);
		if (cc > ccMax) continue;
		const value = ccToValue[cc];
		if ((value & END_SEGMENT_BIT) !== 0) {
			onToken(value, 0);
		} else if ((value & CONTINUATION_BIT) === 0) {
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

/**
 * Encode a signed integer as a VLQ token.
 * @param {number} value signed integer
 * @returns {string} VLQ-encoded token
 */
const valueAsToken = (value) => {
	const sign = (value >>> 31) & 1;
	const mask = value >> 31;
	const absValue = (value + mask) ^ mask;
	let data = (absValue << 1) | sign;
	let str = "";
	for (;;) {
		const sextet = data & 0x1f;
		data >>= 5;
		if (data === 0) {
			return str + ALPHABET_CHARS[sextet];
		}
		str += ALPHABET_CHARS[sextet | CONTINUATION_BIT];
	}
};

module.exports = {
	END_SEGMENT: END_SEGMENT_BIT,
	INVALID,
	NEXT_LINE,
	readTokens,
	valueAsToken,
};
