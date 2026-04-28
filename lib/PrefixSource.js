/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RawSource = require("./RawSource");
const Source = require("./Source");
const { getMap, getSourceAndMap } = require("./helpers/getFromStreamChunks");
const streamChunks = require("./helpers/streamChunks");
const {
	isDualStringBufferCachingEnabled,
} = require("./helpers/stringBufferUtils");

/** @typedef {import("./Source").HashLike} HashLike */
/** @typedef {import("./Source").MapOptions} MapOptions */
/** @typedef {import("./Source").RawSourceMap} RawSourceMap */
/** @typedef {import("./Source").SourceAndMap} SourceAndMap */
/** @typedef {import("./Source").SourceValue} SourceValue */
/** @typedef {import("./helpers/getGeneratedSourceInfo").GeneratedSourceInfo} GeneratedSourceInfo */
/** @typedef {import("./helpers/streamChunks").OnChunk} OnChunk */
/** @typedef {import("./helpers/streamChunks").OnName} OnName */
/** @typedef {import("./helpers/streamChunks").OnSource} OnSource */
/** @typedef {import("./helpers/streamChunks").Options} Options */

const REPLACE_REGEX = /\n(?=.|\s)/g;

class PrefixSource extends Source {
	/**
	 * @param {string} prefix prefix
	 * @param {string | Buffer | Source} source source
	 */
	constructor(prefix, source) {
		super();
		/**
		 * @private
		 * @type {string}
		 */
		this._prefix = prefix;
		/**
		 * @private
		 * @type {Source}
		 */
		this._source =
			typeof source === "string" || Buffer.isBuffer(source)
				? new RawSource(source, true)
				: source;
		/**
		 * @private
		 * @type {Buffer | undefined}
		 */
		this._cachedBuffer = undefined;
		/**
		 * @private
		 * @type {Buffer[] | undefined}
		 */
		this._cachedBuffers = undefined;
	}

	getPrefix() {
		return this._prefix;
	}

	original() {
		return this._source;
	}

	/**
	 * @returns {SourceValue} source
	 */
	source() {
		const node = /** @type {string} */ (this._source.source());
		const prefix = this._prefix;
		return prefix + node.replace(REPLACE_REGEX, `\n${prefix}`);
	}

	/**
	 * Cache the encoded buffer so repeat `buffer()` / `size()` calls don't
	 * re-run the regex replace and re-encode the prefixed string. Mirrors
	 * the `_valueAsBuffer` caching used by `RawSource`, `OriginalSource`,
	 * and `SourceMapSource`. First call still goes through `this.source()`
	 * plus `Buffer.from` because V8's string-replace + utf8 encode beats
	 * a hand-written single-pass copy on typical ASCII inputs.
	 * @returns {Buffer} buffer
	 */
	buffer() {
		if (this._cachedBuffer !== undefined) return this._cachedBuffer;
		const value = Buffer.from(/** @type {string} */ (this.source()), "utf8");
		if (isDualStringBufferCachingEnabled()) {
			this._cachedBuffer = value;
		}
		return value;
	}

	/**
	 * Returns a `Buffer[]` that concatenates to the prefixed source. Each
	 * content chunk is a `subarray` of the underlying buffer (no copy);
	 * only the prefix buffer is materialized. Cached for repeat calls.
	 * @returns {Buffer[]} buffers
	 */
	buffers() {
		if (this._cachedBuffers !== undefined) return this._cachedBuffers;
		const prefix = this._prefix;
		/** @type {Buffer[]} */
		let result;
		if (prefix.length === 0) {
			result = /** @type {Source} */ (this._source).buffers();
		} else {
			const content = this._source.buffer();
			const prefixBuffer = Buffer.from(prefix, "utf8");
			if (content.length === 0) {
				result = [prefixBuffer];
			} else {
				result = [prefixBuffer];
				const len = content.length;
				let i = 0;
				while (i < len) {
					const nl = content.indexOf(0x0a, i);
					if (nl === -1) {
						result.push(i === 0 ? content : content.subarray(i));
						break;
					}
					result.push(content.subarray(i, nl + 1));
					// Match the regex `/\n(?=.|\s)/g` — only re-emit the prefix
					// when at least one more byte follows the newline.
					if (nl + 1 < len) result.push(prefixBuffer);
					i = nl + 1;
				}
			}
		}
		if (isDualStringBufferCachingEnabled()) {
			this._cachedBuffers = result;
		}
		return result;
	}

	/**
	 * @param {MapOptions=} options map options
	 * @returns {RawSourceMap | null} map
	 */
	map(options) {
		return getMap(this, options);
	}

	/**
	 * @param {MapOptions=} options map options
	 * @returns {SourceAndMap} source and map
	 */
	sourceAndMap(options) {
		return getSourceAndMap(this, options);
	}

	/**
	 * @param {Options} options options
	 * @param {OnChunk} onChunk called for each chunk of code
	 * @param {OnSource} onSource called for each source
	 * @param {OnName} onName called for each name
	 * @returns {GeneratedSourceInfo} generated source info
	 */
	streamChunks(options, onChunk, onSource, onName) {
		const prefix = this._prefix;
		const prefixOffset = prefix.length;
		const linesOnly = Boolean(options && options.columns === false);
		const { generatedLine, generatedColumn, source } = streamChunks(
			this._source,
			options,
			(
				chunk,
				generatedLine,
				generatedColumn,
				sourceIndex,
				originalLine,
				originalColumn,
				nameIndex,
			) => {
				if (generatedColumn !== 0) {
					// In the middle of the line, we just adject the column
					generatedColumn += prefixOffset;
				} else if (chunk !== undefined) {
					// At the start of the line, when we have source content
					// add the prefix as generated mapping
					// (in lines only mode we just add it to the original mapping
					// for performance reasons)
					if (linesOnly || sourceIndex < 0) {
						chunk = prefix + chunk;
					} else if (prefixOffset > 0) {
						onChunk(prefix, generatedLine, generatedColumn, -1, -1, -1, -1);
						generatedColumn += prefixOffset;
					}
				} else if (!linesOnly) {
					// Without source content, we only need to adject the column info
					// expect in lines only mode where prefix is added to original mapping
					generatedColumn += prefixOffset;
				}
				onChunk(
					chunk,
					generatedLine,
					generatedColumn,
					sourceIndex,
					originalLine,
					originalColumn,
					nameIndex,
				);
			},
			onSource,
			onName,
		);
		return {
			generatedLine,
			generatedColumn:
				generatedColumn === 0
					? 0
					: prefixOffset + /** @type {number} */ (generatedColumn),
			source:
				source !== undefined
					? prefix + source.replace(REPLACE_REGEX, `\n${prefix}`)
					: undefined,
		};
	}

	/**
	 * @param {HashLike} hash hash
	 * @returns {void}
	 */
	updateHash(hash) {
		hash.update("PrefixSource");
		this._source.updateHash(hash);
		hash.update(this._prefix);
	}
}

module.exports = PrefixSource;
