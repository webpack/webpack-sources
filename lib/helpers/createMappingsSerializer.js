/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ALPHABET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const CONTINUATION_BIT = 0x20;

const createMappingsSerializer = () => {
	let currentLine = 1;
	let currentColumn = 0;
	let currentSourceIndex = 0;
	let currentOriginalLine = 1;
	let currentOriginalColumn = 0;
	let currentNameIndex = 0;
	let activeMapping = false;
	let initial = true;
	return (
		generatedLine,
		generatedColumn,
		sourceIndex,
		originalLine,
		originalColumn,
		nameIndex
	) => {
		let str = "";
		if (sourceIndex < 0 && (!activeMapping || currentLine !== generatedLine)) {
			// avoid writing unneccessary generated mappings
			return str;
		}
		while (currentLine < generatedLine) {
			str += ";";
			currentLine++;
			initial = true;
			currentColumn = 0;
		}
		if (!initial) str += ",";
		initial = false;
		const writeValue = value => {
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
		};
		writeValue(generatedColumn - currentColumn);
		currentColumn = generatedColumn;
		if (sourceIndex >= 0) {
			activeMapping = true;
			writeValue(sourceIndex - currentSourceIndex);
			currentSourceIndex = sourceIndex;
			writeValue(originalLine - currentOriginalLine);
			currentOriginalLine = originalLine;
			writeValue(originalColumn - currentOriginalColumn);
			currentOriginalColumn = originalColumn;
			if (nameIndex >= 0) {
				writeValue(nameIndex - currentNameIndex);
				currentNameIndex = nameIndex;
			}
		} else {
			activeMapping = false;
		}
		return str;
	};
};

module.exports = createMappingsSerializer;
