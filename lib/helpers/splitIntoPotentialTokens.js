/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

// \n = 10
// ; = 59
// { = 123
// } = 125
// <space> = 32
// \r = 13
// \t = 9

// Two Uint8Array lookup tables replace the chained `===` comparisons in the
// hot scan loops. V8 keeps the tables in L1 as a constant, so the inner
// condition becomes a single bounds check plus a typed-array load, which is
// cheaper than 4–6 branches per character for long inputs.
// Indexed by charCode; entries outside the ASCII range are implicitly 0.
const BOUNDARY = new Uint8Array(126);
BOUNDARY[10] = 1; // \n
BOUNDARY[59] = 1; // ;
BOUNDARY[123] = 1; // {
BOUNDARY[125] = 1; // }

const SEPARATOR = new Uint8Array(126);
SEPARATOR[9] = 1; // \t
SEPARATOR[13] = 1; // \r
SEPARATOR[32] = 1; // space
SEPARATOR[59] = 1; // ;
SEPARATOR[123] = 1; // {
SEPARATOR[125] = 1; // }

/**
 * @param {string} str string
 * @returns {string[] | null} array of string separated by potential tokens
 */
const splitIntoPotentialTokens = (str) => {
	const len = str.length;
	if (len === 0) return null;
	const results = [];
	let i = 0;
	while (i < len) {
		const start = i;
		block: {
			let cc = str.charCodeAt(i);
			// Advance through non-boundary characters. Non-ASCII codepoints
			// (cc >= 126) are by definition not boundaries.
			while (cc >= 126 || BOUNDARY[cc] === 0) {
				if (++i >= len) break block;
				cc = str.charCodeAt(i);
			}
			// Consume trailing separators so they stay grouped with the token.
			while (cc < 126 && SEPARATOR[cc] === 1) {
				if (++i >= len) break block;
				cc = str.charCodeAt(i);
			}
			if (cc === 10) {
				i++;
			}
		}
		results.push(str.slice(start, i));
	}
	return results;
};

module.exports = splitIntoPotentialTokens;
