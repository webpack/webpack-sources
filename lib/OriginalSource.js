/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const { getMap, getSourceAndMap } = require("./helpers/getFromStreamChunks");
const Source = require("./Source");

const SPLIT_REGEX = /[^\n;{}]+[;{} \r\t]*\n?|[;{} \r\t]+\n?|\n/g;
const SPLIT_LINES_REGEX = /[^\n]+\n?|\n/g;
const NEW_LINE_CHAR_CODE = "\n".charCodeAt(0);

class OriginalSource extends Source {
	constructor(value, name) {
		super();
		const isBuffer = Buffer.isBuffer(value);
		this._value = isBuffer ? undefined : value;
		this._valueAsBuffer = isBuffer ? value : undefined;
		this._name = name;
	}

	getName() {
		return this._name;
	}

	source() {
		if (this._value === undefined) {
			this._value = this._valueAsBuffer.toString("utf-8");
		}
		return this._value;
	}

	buffer() {
		if (this._valueAsBuffer === undefined) {
			this._valueAsBuffer = Buffer.from(this._value, "utf-8");
		}
		return this._valueAsBuffer;
	}

	map(options) {
		return getMap(this, options);
	}

	sourceAndMap(options) {
		return getSourceAndMap(this, options);
	}

	/**
	 * @param {object} options options
	 * @param {function(string, number, number, number, number, number, number): void} onChunk called for each chunk of code
	 * @param {function(number, string, string)} onSource called for each source
	 * @param {function(number, string)} onName called for each name
	 * @returns {void}
	 */
	streamChunks(options, onChunk, onSource, onName) {
		if (this._value === undefined) {
			this._value = this._valueAsBuffer.toString("utf-8");
		}
		onSource(0, this._name, this._value);
		if (options && options.columns === false) {
			let line = 1;
			const matches = this._value.match(SPLIT_LINES_REGEX);
			if (matches !== null) {
				let match;
				for (match of matches) {
					onChunk(match, line, 0, 0, line, 0, -1);
					line++;
				}
				return match.endsWith("\n")
					? {
							generatedLine: matches.length + 1,
							generatedColumn: 0
					  }
					: {
							generatedLine: matches.length,
							generatedColumn: match.length
					  };
			}
		} else {
			const matches = this._value.match(SPLIT_REGEX);
			if (matches !== null) {
				let line = 1;
				let column = 0;
				for (const match of matches) {
					const isEndOfLine =
						match.charCodeAt(match.length - 1) === NEW_LINE_CHAR_CODE;
					if (isEndOfLine && match.length === 1) {
						onChunk(match, line, column, -1, -1, -1, -1);
					} else {
						onChunk(match, line, column, 0, line, column, -1);
					}
					if (isEndOfLine) {
						line++;
						column = 0;
					} else {
						column += match.length;
					}
				}
				return {
					generatedLine: line,
					generatedColumn: column
				};
			}
		}
		return {
			generatedLine: 1,
			generatedColumn: 0
		};
	}

	updateHash(hash) {
		if (this._valueAsBuffer === undefined) {
			this._valueAsBuffer = Buffer.from(this._value, "utf-8");
		}
		hash.update("OriginalSource");
		hash.update(this._valueAsBuffer);
		hash.update(this._name || "");
	}
}

module.exports = OriginalSource;
