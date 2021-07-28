/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split(
	""
);

const CONTINUATION_BIT = 0x20;

const createMappingsSerializer = options => {
	const linesOnly = options && options.columns === false;
	return linesOnly
		? createLinesOnlyMappingsSerializer()
		: createFullMappingsSerializer();
};

const createFullMappingsSerializer = () => {
	let currentLine = 1;
	let currentColumn = 0;
	let currentSourceIndex = 0;
	let currentOriginalLine = 1;
	let currentOriginalColumn = 0;
	let currentNameIndex = 0;
	let activeMapping = false;
	let activeName = false;
	let initial = true;
	return (
		generatedLine,
		generatedColumn,
		sourceIndex,
		originalLine,
		originalColumn,
		nameIndex
	) => {
		if (activeMapping && currentLine === generatedLine) {
			// A mapping is still active
			if (
				sourceIndex === currentSourceIndex &&
				originalLine === currentOriginalLine &&
				originalColumn === currentOriginalColumn &&
				!activeName &&
				nameIndex < 0
			) {
				// avoid repeating the same original mapping
				return "";
			}
		} else {
			// No mapping is active
			if (sourceIndex < 0) {
				// avoid writing unneccessary generated mappings
				return "";
			}
		}

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

		const writeValue = value => {
			if (value === 0) {
				str += "A";
				return;
			}
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
				activeName = true;
			} else {
				activeName = false;
			}
		} else {
			activeMapping = false;
		}
		return str;
	};
};

const createLinesOnlyMappingsSerializer = () => {
	let lastWrittenLine = 0;
	let currentLine = 1;
	let currentSourceIndex = 0;
	let currentOriginalLine = 1;
	return (
		generatedLine,
		_generatedColumn,
		sourceIndex,
		originalLine,
		_originalColumn,
		_nameIndex
	) => {
		let str = "";
		if (sourceIndex < 0) {
			// avoid writing generated mappings at all
			return str;
		}
		if (lastWrittenLine === generatedLine) {
			// avoid writing multiple original mappings per line
			return str;
		}
		while (currentLine < generatedLine) {
			str += ";";
			currentLine++;
		}
		const writeValue = value => {
			if (value === 0) {
				str += "A";
				return;
			}
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
		str += "A";
		if (sourceIndex >= 0) {
			lastWrittenLine = currentLine;
			writeValue(sourceIndex - currentSourceIndex);
			currentSourceIndex = sourceIndex;
			writeValue(originalLine - currentOriginalLine);
			currentOriginalLine = originalLine;
			str += "A";
		}
		return str;
	};
};

module.exports = createMappingsSerializer;
