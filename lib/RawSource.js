/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const streamChunksOfRawSource = require("./helpers/streamChunksOfRawSource");
const Source = require("./Source");

/** @typedef {import("./Source").OnOriginalScope} OnOriginalScope */
/** @typedef {import("./Source").OnGeneratedRange} OnGeneratedRange */

class RawSource extends Source {
	constructor(value, convertToString = false) {
		super();
		const isBuffer = Buffer.isBuffer(value);
		if (!isBuffer && typeof value !== "string") {
			throw new TypeError("argument 'value' must be either string or Buffer");
		}
		this._valueIsBuffer = !convertToString && isBuffer;
		this._value = convertToString && isBuffer ? undefined : value;
		this._valueAsBuffer = isBuffer ? value : undefined;
		this._valueAsString = isBuffer ? undefined : value;
	}

	isBuffer() {
		return this._valueIsBuffer;
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
		return null;
	}

	/**
	 * @param {object} options options
	 * @param {function(string, number, number, number, number, number, number): void} onChunk called for each chunk of code
	 * @param {function(number, string, string)} onSource called for each source
	 * @param {function(number, string)} onName called for each name
	 * @param {OnOriginalScope} onOriginalScope called for each original scope
	 * @param {OnGeneratedRange} onGeneratedRange called for each generated range
	 * @returns {void}
	 */
	streamChunks(
		options,
		onChunk,
		onSource,
		onName,
		onOriginalScope,
		onGeneratedRange
	) {
		if (this._value === undefined) {
			this._value = Buffer.from(this._valueAsBuffer, "utf-8");
		}
		if (this._valueAsString === undefined) {
			this._valueAsString =
				typeof this._value === "string"
					? this._value
					: this._value.toString("utf-8");
		}
		return streamChunksOfRawSource(
			this._valueAsString,
			onChunk,
			onSource,
			onName,
			onOriginalScope,
			onGeneratedRange,
			!!(options && options.finalSource)
		);
	}

	updateHash(hash) {
		if (this._valueAsBuffer === undefined) {
			this._valueAsBuffer = Buffer.from(this._value, "utf-8");
		}
		hash.update("RawSource");
		hash.update(this._valueAsBuffer);
	}
}

module.exports = RawSource;
