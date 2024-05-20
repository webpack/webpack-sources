/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const streamChunksOfRawSource = require("./helpers/streamChunksOfRawSource");
const {
	internString,
	isDualStringBufferCachingEnabled
} = require("./helpers/stringBufferUtils");
const Source = require("./Source");

class RawSource extends Source {
	constructor(value, convertToString = false) {
		super();
		const isBuffer = Buffer.isBuffer(value);
		if (!isBuffer && typeof value !== "string") {
			throw new TypeError("argument 'value' must be either string or Buffer");
		}
		this._valueIsBuffer = !convertToString && isBuffer;
		this._value =
			convertToString && isBuffer
				? undefined
				: typeof value === "string"
				? internString(value)
				: value;
		this._valueAsBuffer = isBuffer ? value : undefined;
		this._valueAsString = isBuffer ? undefined : internString(value);
	}

	isBuffer() {
		return this._valueIsBuffer;
	}

	source() {
		if (this._value === undefined) {
			const value = internString(this._valueAsBuffer.toString("utf-8"));
			if (isDualStringBufferCachingEnabled()) {
				this._value = value;
			}
			return value;
		}
		return this._value;
	}

	buffer() {
		if (this._valueAsBuffer === undefined) {
			const value = Buffer.from(this._value, "utf-8");
			if (isDualStringBufferCachingEnabled()) {
				this._valueAsBuffer = value;
			}
			return value;
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
	 * @returns {void}
	 */
	streamChunks(options, onChunk, onSource, onName) {
		if (this._value === undefined && isDualStringBufferCachingEnabled()) {
			this._value = Buffer.from(this._valueAsBuffer, "utf-8");
		}
		let strValue = this._valueAsString;
		if (strValue === undefined) {
			strValue =
				typeof this._value === "string"
					? this._value
					: internString(this._value.toString("utf-8"));
			if (isDualStringBufferCachingEnabled()) {
				this._valueAsString = strValue;
			}
		}
		return streamChunksOfRawSource(
			strValue,
			onChunk,
			onSource,
			onName,
			!!(options && options.finalSource)
		);
	}

	updateHash(hash) {
		hash.update("RawSource");
		hash.update(this.buffer());
	}
}

module.exports = RawSource;
