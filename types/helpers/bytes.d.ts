export type BufferOutputType = "buffer" | "uint8array";
/**
 * @param {Uint8Array[]} list list of bytes
 * @returns {Uint8Array} all bytes joined into a new array (always a copy,
 * like `Buffer.concat`)
 */
export function concatBytes(list: Uint8Array[]): Uint8Array;
/**
 * Joins bytes into a new array in the configured output type. With the
 * `"buffer"` output type `Buffer.concat` builds it directly, skipping the
 * zero-fill of a fresh `Uint8Array` and the wrapping as a `Buffer`.
 * @param {Uint8Array[]} list list of bytes
 * @returns {Buffer} all bytes joined, in the configured output type
 */
export function concatBytesOutput(list: Uint8Array[]): Buffer;
/**
 * Number of bytes `str` takes as utf8, without encoding it. Lone surrogates
 * count as U+FFFD (3 bytes), as encoding replaces them with it. Used where
 * `Buffer.byteLength` is missing: no standard typed-array API counts utf8
 * bytes without encoding.
 * @param {string} str string
 * @returns {number} utf8 byte length
 */
export function countUtf8Bytes(str: string): number;
/** @type {(bytes: Uint8Array) => string} */
export const decodeUtf8: (bytes: Uint8Array) => string;
/** @type {(str: string) => Uint8Array} */
export const encodeUtf8: (str: string) => Uint8Array;
/**
 * Encodes a string to utf8 bytes in the configured output type. With the
 * `"buffer"` output type the `Buffer` is built directly: `TextEncoder` has no
 * allocation pool, so it is much slower for small strings, and its result
 * would need wrapping as a `Buffer` anyway.
 * @param {string} str string
 * @returns {Buffer} utf8 encoded bytes in the configured output type
 */
export function encodeUtf8Output(str: string): Buffer;
/**
 * @param {Uint8Array} a bytes
 * @param {Uint8Array} b bytes
 * @returns {boolean} true when both hold the same bytes
 */
export function equalBytes(a: Uint8Array, b: Uint8Array): boolean;
/**
 * @returns {BufferOutputType} what `buffer()` / `buffers()` (and the other
 * byte-returning methods) hand out
 */
export function getBufferOutputType(): BufferOutputType;
/**
 * @param {unknown} value value
 * @returns {value is Uint8Array} true when value is a `Uint8Array` (or `Buffer`)
 */
export function isBytes(value: unknown): value is Uint8Array;
/**
 * The class whose instances are already in the output form, so hot
 * constructors can store them after one `instanceof`, without calling
 * `toOutputBytes`: `Buffer` for the `"buffer"` output type, `Uint8Array` when
 * `Buffer` does not exist (every `Uint8Array` is then a plain one), and none
 * for `"uint8array"` with `Buffer` (a `Buffer` input needs a plain view).
 *
 * `buffer` is true for the `"buffer"` output type, so hot paths can call
 * `Buffer.from` / `Buffer.concat` inline (no extra call layer) and only touch
 * `Buffer` when it exists.
 * @type {{ Bytes: abstract new (...args: never[]) => unknown, buffer: boolean }}
 */
export const output: {
	Bytes: abstract new (...args: never[]) => unknown;
	buffer: boolean;
};
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
 *
 * Bytes are converted when a source stores them, so set this once, before
 * creating sources: a source created earlier keeps handing out the form it
 * stored.
 * @param {BufferOutputType} type output type
 * @returns {void}
 */
export function setBufferOutputType(type: BufferOutputType): void;
/**
 * Converts bytes to the configured output type, without copying. Sources call
 * it once, when they store bytes, so the hot accessors return the stored
 * value directly.
 * @param {Uint8Array} bytes bytes
 * @returns {Buffer} bytes in the configured output type (typed as `Buffer`
 * for compatibility; a plain `Uint8Array` with the `"uint8array"` output type)
 */
export function toOutputBytes(bytes: Uint8Array): Buffer;
/** @type {(str: string) => number} */
export const utf8ByteLength: (str: string) => number;
