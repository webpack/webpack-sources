/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../Source").Binding} Binding */
/** @typedef {import("../Source").Callsite} Callsite */
/** @typedef {import("../Source").DefinitionReference} DefinitionReference */
/** @typedef {import("../Source").OnGeneratedRange} OnGeneratedRange */
/** @typedef {import("../Source").OnOriginalScope} OnOriginalScope */

// Source Map Scopes Proposal (originalScopes / generatedRanges).
//
// EXPERIMENTAL. This module implements the VLQ payload readers and
// serializers for the TC39 Source Map Scopes Proposal
// (https://github.com/tc39/source-map/blob/main/proposals/scopes.md). The
// proposal is still evolving: the wire format, flag bits, and even the
// field names may change. The public shape of these helpers and of the
// OnOriginalScope / OnGeneratedRange callbacks should therefore be
// considered unstable. Do not depend on them as part of a stable API yet.
//
// Everything related to scopes lives in this one file (decoders, encoders,
// shared VLQ alphabet) — the rest of the library treats scope/range data
// as two optional trailing callbacks on `streamChunks` that are forwarded
// where it's safe and dropped where coordinate remapping isn't supported
// yet (combined source maps, ReplaceSource generated ranges).
//
// Performance: the decoders inline the VLQ state machine rather than
// calling through a per-token callback, which avoids one closure call per
// sextet on the hot path. The encoder has a single-sextet fast path for
// the common case of small values (|n| < 16), which skips the fallback
// loop entirely.

const ALPHABET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
/**
 * Pre-split alphabet: indexing into an array of single chars is ~2x faster
 * than `ALPHABET[i]` on a plain string for every JIT we care about.
 */
const ALPHABET_CHARS = [...ALPHABET];

const CONTINUATION_BIT = 0x20;
const END_SEGMENT_BIT = 0x40;
const NEXT_LINE_BIT = END_SEGMENT_BIT | 0x01;
const INVALID_BIT = END_SEGMENT_BIT | 0x02;
const DATA_MASK = 0x1f;

/**
 * Lookup table mapping a character code to its sextet value or control bit.
 * Base64 alphabet chars (A-Z, a-z, 0-9, +, /) map to their 6-bit value
 * (0..63); `,` maps to `END_SEGMENT_BIT`; `;` maps to `NEXT_LINE_BIT`;
 * anything else maps to `INVALID_BIT` and is skipped silently.
 *
 * Sized to cover `z` (char code 122); any higher char code is bounds-checked
 * and skipped at the call site.
 * @type {Uint8Array}
 */
const ccToValue = new Uint8Array(123);
ccToValue.fill(INVALID_BIT);
for (let i = 0; i < ALPHABET.length; i++) {
	ccToValue[ALPHABET.charCodeAt(i)] = i;
}
ccToValue[0x2c /* ',' */] = END_SEGMENT_BIT;
ccToValue[0x3b /* ';' */] = NEXT_LINE_BIT;

const CC_MAX = ccToValue.length - 1;

/** `originalScopes` flag: scope-start entry carries a name index. */
const HAS_NAME_FLAG = 1;
/** `generatedRanges` flag: range-start entry carries a `DefinitionReference`. */
const HAS_DEFINITION_FLAG = 1;
/** `generatedRanges` flag: range-start entry carries a `Callsite`. */
const HAS_CALLSITE_FLAG = 2;

/**
 * Encode a signed integer as a single VLQ token.
 *
 * Uses the same signed-VLQ scheme as `mappings`: the value is converted to a
 * zig-zag-encoded unsigned integer (sign bit at bit 0), then emitted as a
 * sequence of 5-bit sextets, most significant last, with the continuation
 * bit set on every non-terminal sextet.
 *
 * The common case is a single sextet (|value| < 16), which is served by a
 * fast path that avoids the continuation loop entirely.
 * @param {number} value signed integer
 * @returns {string} VLQ-encoded token
 */
const valueAsToken = (value) => {
	const sign = (value >>> 31) & 1;
	const mask = value >> 31;
	const absValue = (value + mask) ^ mask;
	let data = (absValue << 1) | sign;
	// Fast path: single sextet covers |value| <= 15.
	if (data < 32) return ALPHABET_CHARS[data];
	let str = ALPHABET_CHARS[(data & DATA_MASK) | CONTINUATION_BIT];
	data >>= 5;
	while (data >= 32) {
		str += ALPHABET_CHARS[(data & DATA_MASK) | CONTINUATION_BIT];
		data >>= 5;
	}
	return str + ALPHABET_CHARS[data];
};

/**
 * Decode the `originalScopes` VLQ string for a single source and emit each
 * scope boundary via `onOriginalScope`.
 *
 * For scope **start** events `flags >= 0` and carries the scope kind / name
 * index / variable indices. For scope **end** events `flags === -1` and the
 * other fields are `-1` / empty.
 *
 * Non-string input (including `undefined`) is silently ignored so callers
 * don't need to pre-check the field.
 * @experimental See module doc.
 * @param {number} sourceIndex source index this scope string belongs to
 * @param {string | undefined} str the original-scopes VLQ string
 * @param {OnOriginalScope} onOriginalScope callback invoked for every scope boundary
 * @returns {void}
 */
const readOriginalScopes = (sourceIndex, str, onOriginalScope) => {
	if (typeof str !== "string") return;
	let dataPos = 0;
	let line = 1;
	let column = 0;
	let kind = -1;
	let flags = -1;
	let name = -1;
	/** @type {number[]} */
	const variables = [];
	let acc = 0;
	let shift = 0;
	const len = str.length;
	for (let i = 0; i < len; i++) {
		const cc = str.charCodeAt(i);
		if (cc > CC_MAX) continue;
		const v = ccToValue[cc];
		if ((v & END_SEGMENT_BIT) !== 0) {
			// Skip unrecognized chars silently.
			if (v === INVALID_BIT) continue;
			// Both `,` and `;` end the current scope entry — `originalScopes`
			// is flat (no per-line convention) so they're treated alike.
			if (dataPos > 0) {
				onOriginalScope(
					sourceIndex,
					line,
					column,
					flags,
					kind,
					name,
					variables,
				);
				dataPos = 0;
				column = 0;
				kind = -1;
				flags = -1;
				name = -1;
				variables.length = 0;
			}
		} else if ((v & CONTINUATION_BIT) === 0) {
			// Last sextet of a signed VLQ value.
			acc |= v << shift;
			const value = acc & 1 ? -(acc >> 1) : acc >> 1;
			acc = 0;
			shift = 0;
			switch (dataPos) {
				case 0:
					line += value;
					dataPos = 1;
					break;
				case 1:
					column = value;
					dataPos = 2;
					break;
				case 2:
					kind = value;
					dataPos = 3;
					break;
				case 3:
					flags = value;
					// Skip the name field if the name flag isn't set.
					dataPos = (flags & HAS_NAME_FLAG) === 0 ? 5 : 4;
					break;
				case 4:
					name = value;
					dataPos = 5;
					break;
				case 5:
					variables.push(value);
					break;
				default:
					break;
			}
		} else {
			// Continuation sextet; accumulate and continue.
			acc |= (v & DATA_MASK) << shift;
			shift += 5;
		}
	}
	if (dataPos > 0) {
		onOriginalScope(sourceIndex, line, column, flags, kind, name, variables);
	}
};

/**
 * Walk every per-source string in a `originalScopes` array and forward each
 * scope boundary to `onOriginalScope` with the correct source index.
 *
 * Non-array input is silently ignored.
 * @experimental See module doc.
 * @param {string[] | undefined} arr per-source VLQ strings
 * @param {OnOriginalScope} onOriginalScope callback invoked for every scope boundary
 * @returns {void}
 */
const readAllOriginalScopes = (arr, onOriginalScope) => {
	if (!Array.isArray(arr)) return;
	for (let i = 0; i < arr.length; i++) {
		readOriginalScopes(i, arr[i], onOriginalScope);
	}
};

/**
 * Decode the `generatedRanges` VLQ string and emit each range boundary via
 * `onGeneratedRange`.
 *
 * For range **start** events `flags >= 0` and carries an optional
 * `DefinitionReference` (if `HAS_DEFINITION_FLAG` is set), an optional
 * `Callsite` (if `HAS_CALLSITE_FLAG` is set, used for inlined ranges), and
 * a list of `Binding` entries describing variable bindings/subranges. For
 * range **end** events `flags === -1` and the extra fields are `undefined`.
 *
 * The decoder maintains per-field running deltas exactly matching the
 * proposal's wire format (including the reset semantics when a definition
 * source index or callsite source index changes).
 *
 * Non-string input is silently ignored.
 * @experimental See module doc.
 * @param {string | undefined} str the generated-ranges VLQ string
 * @param {OnGeneratedRange} onGeneratedRange callback invoked for every range boundary
 * @returns {void}
 */
const readGeneratedRanges = (str, onGeneratedRange) => {
	if (typeof str !== "string") return;
	let dataPos = 0;
	let generatedLine = 1;
	let generatedColumn = 0;
	let flags = -1;
	/** @type {DefinitionReference} */
	const definition = [0, 0];
	/** @type {Callsite} */
	const callsite = [0, 0, 0];
	/** @type {Binding[]} */
	const bindings = [];
	let remainingSubranges = 0;
	let subrangeLine = 0;
	let subrangeColumn = 0;
	let acc = 0;
	let shift = 0;
	const len = str.length;
	for (let i = 0; i < len; i++) {
		const cc = str.charCodeAt(i);
		if (cc > CC_MAX) continue;
		const v = ccToValue[cc];
		if ((v & END_SEGMENT_BIT) !== 0) {
			if (v === INVALID_BIT) continue;
			if (dataPos === 1) {
				// Only the column delta was provided — this is a range-end entry.
				onGeneratedRange(
					generatedLine,
					generatedColumn,
					-1,
					undefined,
					undefined,
					undefined,
				);
				dataPos = 0;
				flags = 0;
				bindings.length = 0;
			} else if (dataPos > 0) {
				onGeneratedRange(
					generatedLine,
					generatedColumn,
					flags,
					flags & HAS_DEFINITION_FLAG ? definition : undefined,
					flags & HAS_CALLSITE_FLAG ? callsite : undefined,
					bindings,
				);
				dataPos = 0;
				flags = 0;
				bindings.length = 0;
			}
			if (v === NEXT_LINE_BIT) {
				generatedLine++;
				generatedColumn = 0;
			}
		} else if ((v & CONTINUATION_BIT) === 0) {
			acc |= v << shift;
			const value = acc & 1 ? -(acc >> 1) : acc >> 1;
			acc = 0;
			shift = 0;
			switch (dataPos) {
				case 0:
					generatedColumn += value;
					dataPos = 1;
					break;
				case 1:
					flags = value;
					dataPos = 2;
					break;
				case 2:
					if ((flags & HAS_DEFINITION_FLAG) !== 0) {
						definition[0] += value;
						if (value !== 0) definition[1] = 0;
						dataPos = 3;
						break;
					}
				/* falls through */
				case 3:
					if ((flags & HAS_DEFINITION_FLAG) !== 0) {
						definition[1] += value;
						dataPos = 4;
						break;
					}
				/* falls through */
				case 4:
					if ((flags & HAS_CALLSITE_FLAG) !== 0) {
						callsite[0] += value;
						if (value !== 0) {
							callsite[1] = 0;
							callsite[2] = 0;
						}
						dataPos = 5;
						break;
					}
				/* falls through */
				case 5:
					if ((flags & HAS_CALLSITE_FLAG) !== 0) {
						callsite[1] += value;
						if (value !== 0) callsite[2] = 0;
						dataPos = 6;
						break;
					}
				/* falls through */
				case 6:
					if ((flags & HAS_CALLSITE_FLAG) !== 0) {
						callsite[2] += value;
						dataPos = 7;
						break;
					}
				/* falls through */
				case 7:
					bindings.push([value]);
					dataPos = 8;
					break;
				case 8:
					if (value >= 0) {
						bindings.push([value]);
					} else {
						remainingSubranges = -value;
						dataPos = 9;
					}
					break;
				case 9:
					bindings[bindings.length - 1].push(value - subrangeLine);
					if (subrangeLine !== value) {
						subrangeLine = value;
						subrangeColumn = 0;
					}
					dataPos = 10;
					break;
				case 10:
					bindings[bindings.length - 1].push(value - subrangeColumn);
					subrangeColumn = value;
					dataPos = 11;
					break;
				case 11:
					bindings[bindings.length - 1].push(value);
					dataPos = --remainingSubranges === 0 ? 7 : 9;
					break;
				default:
					break;
			}
		} else {
			acc |= (v & DATA_MASK) << shift;
			shift += 5;
		}
	}
	if (dataPos === 1) {
		onGeneratedRange(
			generatedLine,
			generatedColumn,
			-1,
			undefined,
			undefined,
			undefined,
		);
	} else if (dataPos > 0) {
		onGeneratedRange(
			generatedLine,
			generatedColumn,
			flags,
			flags & HAS_DEFINITION_FLAG ? definition : undefined,
			flags & HAS_CALLSITE_FLAG ? callsite : undefined,
			bindings,
		);
	}
};

/**
 * @callback OriginalScopesSerializer
 * @param {number} line 1-based original line
 * @param {number} column 0-based original column
 * @param {number} flags bit flags; `-1` marks the end of a scope
 * @param {number} kind scope kind (meaningful only when `flags >= 0`)
 * @param {number} name name index, or `-1` if absent
 * @param {number[] | undefined} variables variable name indices
 * @returns {string} VLQ token(s) to append to the source's `originalScopes` string
 */

/**
 * Create a stateful serializer for one source's `originalScopes` string. Each
 * call appends one scope boundary to the running state (line delta, column,
 * optional kind/flags/name/variables) and returns the new tokens.
 * @experimental See module doc.
 * @returns {OriginalScopesSerializer} serializer for one source's scope string
 */
const createOriginalScopesSerializer = () => {
	let initial = true;
	let currentLine = 1;
	return (line, column, flags, kind, name, variables) => {
		let str = initial ? "" : ",";
		str += valueAsToken(line - currentLine);
		currentLine = line;
		str += valueAsToken(column);
		if (flags >= 0) {
			str += valueAsToken(kind);
			str += valueAsToken(flags);
			if (name >= 0) str += valueAsToken(name);
			if (variables) {
				for (const v of variables) str += valueAsToken(v);
			}
		}
		initial = false;
		return str;
	};
};

/**
 * @callback GeneratedRangesSerializer
 * @param {number} generatedLine 1-based generated line
 * @param {number} generatedColumn 0-based generated column
 * @param {number} flags bit flags; `-1` marks the end of a range
 * @param {DefinitionReference | undefined} definition optional definition reference
 * @param {Callsite | undefined} callsite optional callsite (for inlined ranges)
 * @param {Binding[] | undefined} bindings optional binding list
 * @returns {string} VLQ token(s) to append to the `generatedRanges` string
 */

/**
 * Create a stateful serializer for the `generatedRanges` string. Each call
 * appends one range boundary to the running state (line/column deltas,
 * optional flags/definition/callsite/bindings) and returns the new tokens.
 * @experimental See module doc.
 * @returns {GeneratedRangesSerializer} serializer for the generated-ranges string
 */
const createGeneratedRangesSerializer = () => {
	let initial = true;
	let currentLine = 1;
	let currentColumn = 0;
	// Definition-reference running deltas.
	let defSource = 0;
	let defScope = 0;
	// Callsite running deltas.
	let callSource = 0;
	let callLine = 0;
	let callColumn = 0;
	return (line, column, flags, definition, callsite, bindings) => {
		let str;
		if (currentLine < line) {
			// `;` is the line separator in generatedRanges, same as `mappings`.
			// Single-newline is the overwhelmingly common case — use a plain
			// string literal instead of `.repeat(1)`.
			const gap = line - currentLine;
			str = gap === 1 ? ";" : ";".repeat(gap);
			currentLine = line;
			currentColumn = 0;
			initial = false;
		} else if (initial) {
			str = "";
			initial = false;
		} else {
			str = ",";
		}
		str += valueAsToken(column - currentColumn);
		currentColumn = column;
		if (flags >= 0) {
			str += valueAsToken(flags);
			if (definition !== undefined) {
				const [ds, dc] = definition;
				str += valueAsToken(ds - defSource);
				if (ds !== defSource) {
					defSource = ds;
					defScope = 0;
				}
				str += valueAsToken(dc - defScope);
				defScope = dc;
			}
			if (callsite !== undefined) {
				const [cs, cl, cc] = callsite;
				str += valueAsToken(cs - callSource);
				if (cs !== callSource) {
					callSource = cs;
					callLine = 0;
					callColumn = 0;
				}
				str += valueAsToken(cl - callLine);
				if (cl !== callLine) {
					callLine = cl;
					callColumn = 0;
				}
				str += valueAsToken(cc - callColumn);
				callColumn = cc;
			}
			if (bindings) {
				for (const b of bindings) {
					str += valueAsToken(b[0]);
					if (b.length > 1) {
						str += valueAsToken(-b.length);
						for (let i = 1; i < b.length; i++) str += valueAsToken(b[i]);
					}
				}
			}
		}
		return str;
	};
};

module.exports = {
	HAS_CALLSITE_FLAG,
	HAS_DEFINITION_FLAG,
	// Flag constants are exposed for callers that want to construct scopes/
	// ranges by hand. Experimental — may be renamed.
	HAS_NAME_FLAG,
	createGeneratedRangesSerializer,
	createOriginalScopesSerializer,
	readAllOriginalScopes,
	readGeneratedRanges,
	readOriginalScopes,
};
