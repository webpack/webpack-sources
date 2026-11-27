/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/**
 * Byte helpers. Everything inside webpack-sources works on `Uint8Array`
 * (a `Buffer` is a `Uint8Array` subclass, so it is accepted everywhere).
 * Each helper prefers the standard typed-array / encoding API and only falls
 * back to Node.js `Buffer` when that API is missing (old Node.js versions).
 */

/** @typedef {"buffer" | "uint8array"} BufferOutputType */

// `TextEncoder` / `TextDecoder` are globals since Node.js 11; on older
// versions they are missing and the helpers below fall back to `Buffer`.
/* eslint-disable n/no-unsupported-features/node-builtins */
const hasBuffer = typeof Buffer !== "undefined";

const textEncoder =
	typeof TextEncoder !== "undefined" ? new TextEncoder() : undefined;

// `ignoreBOM` keeps a leading U+FEFF in the output, matching
// `Buffer#toString("utf8")`; by default `TextDecoder` would strip it.
const textDecoder =
	typeof TextDecoder !== "undefined"
		? new TextDecoder("utf-8", { ignoreBOM: true })
		: undefined;
/* eslint-enable n/no-unsupported-features/node-builtins */

/** @type {BufferOutputType} */
let bufferOutputType = hasBuffer ? "buffer" : "uint8array";

/**
 * @returns {BufferOutputType} what `buffer()` / `buffers()` (and the other
 * byte-returning methods) hand out
 */
const getBufferOutputType = () => bufferOutputType;

/**
 * Chooses what `buffer()` / `buffers()` (and the other byte-returning methods,
 * including the bytes passed to `hash.update()`) hand out. Internally bytes
 * are always kept as `Uint8Array`.
 *
 * `"buffer"` (the default when `Buffer` exists) hands out a Node.js `Buffer`,
 * a zero-copy view over the same memory, so `toString("base64")`, `equals()`
 * etc. keep working.
 *
 * `"uint8array"` hands out a plain `Uint8Array` (a zero-copy view when the
 * bytes are held as a `Buffer`), so nothing handed out relies on `Buffer`.
 * @param {BufferOutputType} type output type
 * @returns {void}
 */
const setBufferOutputType = (type) => {
	if (type !== "buffer" && type !== "uint8array") {
		throw new TypeError(
			`Invalid buffer output type '${type}', expected 'buffer' or 'uint8array'`,
		);
	}
	if (type === "buffer" && !hasBuffer) {
		throw new Error(
			"Buffer output type 'buffer' is not supported in this environment, because 'Buffer' is not defined",
		);
	}
	bufferOutputType = type;
};

/**
 * @param {unknown} value value
 * @returns {value is Uint8Array} true when value is a `Uint8Array` (or `Buffer`)
 */
const isBytes = (value) =>
	value instanceof Uint8Array || (hasBuffer && Buffer.isBuffer(value));

/**
 * Converts bytes to the configured output type, without copying.
 * @param {Uint8Array} bytes bytes
 * @returns {Buffer} bytes in the configured output type (typed as `Buffer`
 * for compatibility; a plain `Uint8Array` with the `"uint8array"` output type)
 */
const toOutputBytes = (bytes) => {
	if (hasBuffer) {
		if (bufferOutputType === "buffer") {
			if (!Buffer.isBuffer(bytes)) {
				return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
			}
		} else if (Buffer.isBuffer(bytes)) {
			return /** @type {Buffer} */ (
				new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
			);
		}
	}
	return /** @type {Buffer} */ (bytes);
};

/** @type {(str: string) => Uint8Array} */
const encodeUtf8 =
	textEncoder !== undefined
		? (str) => textEncoder.encode(str)
		: (str) => Buffer.from(str, "utf8");

/**
 * Encodes a string to utf8 bytes in the configured output type. With the
 * `"buffer"` output type the `Buffer` is built directly: `TextEncoder` has no
 * allocation pool, so it is much slower for small strings, and its result
 * would need wrapping as a `Buffer` anyway.
 * @param {string} str string
 * @returns {Buffer} utf8 encoded bytes in the configured output type
 */
const encodeUtf8Output = (str) =>
	bufferOutputType === "buffer"
		? Buffer.from(str, "utf8")
		: toOutputBytes(encodeUtf8(str));

/** @type {(bytes: Uint8Array) => string} */
const decodeUtf8 =
	textDecoder !== undefined
		? (bytes) => textDecoder.decode(bytes)
		: (bytes) =>
				(Buffer.isBuffer(bytes)
					? bytes
					: Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
				).toString("utf8");

// eslint-disable-next-line no-control-regex
const NON_ASCII = /[^\u0000-\u007F]/;

/**
 * Number of bytes `str` takes as utf8, without encoding it. Lone surrogates
 * count as U+FFFD (3 bytes), as encoding replaces them with it. Used where
 * `Buffer.byteLength` is missing: no standard typed-array API counts utf8
 * bytes without encoding.
 * @param {string} str string
 * @returns {number} utf8 byte length
 */
const countUtf8Bytes = (str) => {
	const len = str.length;
	// Native regex scan: pure ASCII (the common case) is one byte per unit.
	const match = NON_ASCII.exec(str);
	if (match === null) return len;
	let bytes = len;
	for (let i = match.index; i < len; i++) {
		const code = str.charCodeAt(i);
		if (code < 0x80) continue;
		if (code < 0x800) {
			bytes += 1;
		} else if (code >= 0xd800 && code <= 0xdbff && i + 1 < len) {
			const next = str.charCodeAt(i + 1);
			if (next >= 0xdc00 && next <= 0xdfff) {
				// Surrogate pair: 2 units -> 4 bytes.
				bytes += 2;
				i++;
			} else {
				bytes += 2;
			}
		} else {
			bytes += 2;
		}
	}
	return bytes;
};

/** @type {(str: string) => number} */
const utf8ByteLength = hasBuffer
	? (str) => Buffer.byteLength(str, "utf8")
	: countUtf8Bytes;

/**
 * @param {Uint8Array[]} list list of bytes
 * @returns {Uint8Array} all bytes joined into a new array (always a copy,
 * like `Buffer.concat`)
 */
const concatBytes = (list) => {
	const count = list.length;
	let length = 0;
	for (let i = 0; i < count; i++) length += list[i].length;
	const result = new Uint8Array(length);
	let offset = 0;
	for (let i = 0; i < count; i++) {
		const item = list[i];
		result.set(item, offset);
		offset += item.length;
	}
	return result;
};

/**
 * @param {Uint8Array} a bytes
 * @param {Uint8Array} b bytes
 * @returns {boolean} true when both hold the same bytes
 */
const equalBytes = (a, b) => {
	if (a === b) return true;
	const len = a.length;
	if (len !== b.length) return false;
	for (let i = 0; i < len; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
};

module.exports = {
	concatBytes,
	countUtf8Bytes,
	decodeUtf8,
	encodeUtf8,
	encodeUtf8Output,
	equalBytes,
	getBufferOutputType,
	isBytes,
	setBufferOutputType,
	toOutputBytes,
	utf8ByteLength,
};
