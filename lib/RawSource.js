/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Source = require("./Source");
const {
	decodeUtf8,
	encodeUtf8,
	encodeUtf8Output,
	equalBytes,
	isBytes,
	output,
	toOutputBytes,
	utf8ByteLength,
} = require("./helpers/bytes");
const streamChunksOfRawSource = require("./helpers/streamChunksOfRawSource");
const {
	internString,
	isDualStringBufferCachingEnabled,
} = require("./helpers/stringBufferUtils");

/** @typedef {import("./Source").ClearCacheOptions} ClearCacheOptions */
/** @typedef {import("./Source").HashLike} HashLike */
/** @typedef {import("./Source").MapOptions} MapOptions */
/** @typedef {import("./Source").RawSourceMap} RawSourceMap */
/** @typedef {import("./Source").SourceValue} SourceValue */
/** @typedef {import("./helpers/getGeneratedSourceInfo").GeneratedSourceInfo} GeneratedSourceInfo */
/** @typedef {import("./helpers/streamChunks").OnChunk} OnChunk */
/** @typedef {import("./helpers/streamChunks").OnName} OnName */
/** @typedef {import("./helpers/streamChunks").OnSource} OnSource */
/** @typedef {import("./helpers/streamChunks").Options} Options */

/**
 * Whether `buffer` can be rebuilt from `string` (its utf8 decoding) byte for
 * byte. Decoding replaces each malformed sequence with U+FFFD, so a string
 * without U+FFFD always round-trips; only one containing it is compared.
 * @param {string} string the cached string form
 * @param {Uint8Array} buffer the cached buffer form
 * @returns {boolean} true when the utf8 encoding of `string` equals `buffer`
 */
const isLosslessUtf8 = (string, buffer) =>
	!string.includes("\uFFFD") || equalBytes(encodeUtf8(string), buffer);

class RawSource extends Source {
	/**
	 * @param {string | Uint8Array} value value
	 * @param {boolean=} convertToString convert to string
	 */
	constructor(value, convertToString = false) {
		super();
		if (typeof value === "string") {
			const interned = internString(value);
			/**
			 * @type {boolean}
			 */
			this._valueIsBuffer = false;
			/**
			 * @type {undefined | string | Buffer}
			 */
			this._value = interned;
			/**
			 * @type {undefined | Buffer}
			 */
			this._valueAsBuffer = undefined;
			/**
			 * @type {undefined | string}
			 */
			this._valueAsString = interned;
		} else if (isBytes(value)) {
			// Stored in the output form, so accessors return it as is.
			const bytes =
				value instanceof output.Bytes
					? /** @type {Buffer} */ (value)
					: toOutputBytes(value);
			this._valueIsBuffer = !convertToString;
			this._value = convertToString ? undefined : bytes;
			this._valueAsBuffer = bytes;
			this._valueAsString = undefined;
		} else {
			throw new TypeError(
				"argument 'value' must be either string, Buffer or Uint8Array",
			);
		}
	}

	isBuffer() {
		return this._valueIsBuffer;
	}

	/**
	 * @returns {SourceValue} source
	 */
	source() {
		if (this._value === undefined) {
			const value = decodeUtf8(/** @type {Uint8Array} */ (this._valueAsBuffer));
			if (isDualStringBufferCachingEnabled()) {
				const interned = internString(value);
				this._value = interned;
				this._valueAsString = interned;
				return interned;
			}
			return value;
		}
		return this._value;
	}

	/**
	 * @returns {Buffer} buffer
	 */
	buffer() {
		if (this._valueAsBuffer === undefined) {
			const str = /** @type {string} */ (this._value);
			const value = output.buffer
				? Buffer.from(str, "utf8")
				: encodeUtf8Output(str);
			if (isDualStringBufferCachingEnabled()) {
				this._valueAsBuffer = value;
			}
			return value;
		}
		return this._valueAsBuffer;
	}

	/**
	 * @returns {number} size
	 */
	size() {
		if (this._cachedSize !== undefined) return this._cachedSize;
		if (this._valueAsBuffer !== undefined) {
			return (this._cachedSize = this._valueAsBuffer.length);
		}
		return (this._cachedSize = utf8ByteLength(
			/** @type {string} */ (this._valueAsString),
		));
	}

	/**
	 * @param {MapOptions=} options map options
	 * @returns {RawSourceMap | null} map
	 */
	// eslint-disable-next-line no-unused-vars
	map(options) {
		return null;
	}

	/**
	 * @param {Options} options options
	 * @param {OnChunk} onChunk called for each chunk of code
	 * @param {OnSource} onSource called for each source
	 * @param {OnName} onName called for each name
	 * @returns {GeneratedSourceInfo} generated source info
	 */
	streamChunks(options, onChunk, onSource, onName) {
		let strValue = this._valueAsString;
		if (strValue === undefined) {
			const value = this.source();
			strValue = typeof value === "string" ? value : decodeUtf8(value);
			if (isDualStringBufferCachingEnabled()) {
				this._valueAsString = internString(strValue);
			}
		}
		return streamChunksOfRawSource(
			strValue,
			onChunk,
			onSource,
			onName,
			Boolean(options && options.finalSource),
		);
	}

	/**
	 * Release cached data held by this source. clearCache is a memory
	 * hint: it never affects correctness or output, only how expensive
	 * the next read is. Subclasses override; the base is a no-op so
	 * every Source supports the call. Composite sources always recurse
	 * into wrapped sources. When the same child is reachable via several
	 * parents (e.g. modules shared across webpack chunks), pass a shared
	 * `visited` WeakSet so each subtree is walked at most once.
	 * Not safe to call concurrently with source/map/sourceAndMap/
	 * streamChunks/updateHash on the same instance.
	 * @param {ClearCacheOptions=} options selectors
	 * @param {WeakSet<Source>=} visited de-duplication set shared across calls
	 * @returns {void}
	 */
	clearCache(options, visited) {
		if (visited !== undefined) {
			if (visited.has(this)) return;
			visited.add(this);
		}
		if (options !== undefined && options.source === false) return;
		if (this._valueIsBuffer) {
			// Buffer is the primary representation (and lives in `_value`);
			// only the string form, populated lazily by streamChunks, is
			// safe to drop.
			this._valueAsString = undefined;
		} else if (
			this._valueAsBuffer !== undefined &&
			this._valueAsString !== undefined &&
			isLosslessUtf8(this._valueAsString, this._valueAsBuffer)
		) {
			// The value is string-backed (constructed from a string, or from a
			// buffer with `convertToString`) and a string copy exists that
			// encodes back to the same bytes, so the buffer can be rebuilt from
			// it and is safe to drop. The buffer stays when it is the only copy
			// (`convertToString` and no string cached yet) or when it is not
			// valid UTF-8, since decoding replaced bytes with U+FFFD.
			if (this._value === undefined) this._value = this._valueAsString;
			this._valueAsBuffer = undefined;
		}
	}

	/**
	 * @param {HashLike} hash hash
	 * @returns {void}
	 */
	updateHash(hash) {
		hash.update("RawSource");
		// A string is hashed as utf8, which is what `buffer()` would have
		// encoded it to, so hashing never has to materialize the buffer.
		// One of the two forms is always set: the constructor sets whichever
		// matches its input, and `clearCache` only drops the derived one.
		if (this._valueAsBuffer === undefined) {
			hash.update(/** @type {string} */ (this._valueAsString));
		} else {
			hash.update(this._valueAsBuffer);
		}
	}
}

module.exports = RawSource;
