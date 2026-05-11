/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * @typedef {object} MapOptions
 * @property {boolean=} columns need columns?
 * @property {boolean=} module is module
 */

/**
 * @typedef {object} RawSourceMap
 * @property {number} version version
 * @property {string[]} sources sources
 * @property {string[]} names names
 * @property {string=} sourceRoot source root
 * @property {string[]=} sourcesContent sources content
 * @property {string} mappings mappings
 * @property {string} file file
 * @property {string=} debugId debug id
 * @property {number[]=} ignoreList ignore list
 * @property {string[]=} originalScopes **Experimental.** Per-source original scopes from the [Source Map Scopes Proposal](https://github.com/tc39/source-map/blob/main/proposals/scopes.md). The proposal is still evolving — the wire format and field names may change.
 * @property {string=} generatedRanges **Experimental.** Generated ranges from the [Source Map Scopes Proposal](https://github.com/tc39/source-map/blob/main/proposals/scopes.md). The proposal is still evolving — the wire format and field names may change.
 */

/**
 * **Experimental — Source Map Scopes Proposal.** Reference from a generated
 * range to the original scope that defines it. First element is a source
 * index (into `RawSourceMap.sources`); second element is the 0-based index of
 * the scope within that source's `originalScopes` stream.
 * @typedef {[sourceIndex: number, scopeIndex: number]} DefinitionReference
 */

/**
 * **Experimental — Source Map Scopes Proposal.** Callsite of an inlined
 * generated range: `[sourceIndex, line, column]` points into the original
 * source that produced the inlined call.
 * @typedef {[sourceIndex: number, line: number, column: number]} Callsite
 */

/**
 * **Experimental — Source Map Scopes Proposal.** One entry per variable
 * binding on a generated range: `[expressionIndex, ...subranges]`, where each
 * subrange is `[lineDelta, columnDelta, nameIndex]`. A missing subrange list
 * (length 1) means the binding has no sub-ranges.
 * @typedef {number[]} Binding
 */

/**
 * **Experimental — Source Map Scopes Proposal.** Callback invoked for each
 * original scope boundary decoded from a source map's `originalScopes`
 * field. `flags >= 0` represents the **start** of a scope and the
 * `kind` / `name` / `variables` fields are meaningful. `flags === -1`
 * represents the **end** of a scope and those fields are `-1` / empty.
 *
 * This API mirrors the TC39 proposal wire format. Because the proposal is
 * still evolving, both this callback shape and the set of `flags` bits may
 * change in future minor releases.
 * @callback OnOriginalScope
 * @param {number} sourceIndex index into `sources` / `originalScopes`
 * @param {number} line 1-based original line
 * @param {number} column 0-based original column
 * @param {number} flags bit flags; `-1` for end of scope
 * @param {number} kind scope kind (only meaningful when `flags >= 0`)
 * @param {number} name name index (-1 if absent)
 * @param {number[]} variables variable name indices
 * @returns {void}
 */

/**
 * **Experimental — Source Map Scopes Proposal.** Callback invoked for each
 * generated range boundary decoded from a source map's `generatedRanges`
 * field. `flags >= 0` represents the **start** of a range and may carry an
 * optional `DefinitionReference`, `Callsite`, and `Binding` list. `flags ===
 * -1` represents the **end** of a range and those extra fields are
 * `undefined`.
 *
 * The `definition` / `callsite` / `bindings` tuples are reused internally
 * across calls — copy them if you need to retain data across callback
 * invocations.
 *
 * Because the proposal is still evolving, both this callback shape and the
 * set of `flags` bits may change in future minor releases.
 * @callback OnGeneratedRange
 * @param {number} generatedLine 1-based generated line
 * @param {number} generatedColumn 0-based generated column
 * @param {number} flags bit flags; `-1` for end of range
 * @param {DefinitionReference | undefined} definition definition reference (if the flag bit is set)
 * @param {Callsite | undefined} callsite callsite for inlined ranges (if the flag bit is set)
 * @param {Binding[] | undefined} bindings bindings list (if present)
 * @returns {void}
 */

/** @typedef {string | Buffer} SourceValue */

/**
 * @typedef {object} SourceAndMap
 * @property {SourceValue} source source
 * @property {RawSourceMap | null} map map
 */

/**
 * @typedef {object} HashLike
 * @property {(data: string | Buffer, inputEncoding?: string) => HashLike} update make hash update
 * @property {(encoding?: string) => string | Buffer} digest get hash digest
 */

class Source {
	/**
	 * @returns {SourceValue} source
	 */
	source() {
		throw new Error("Abstract");
	}

	/**
	 * @returns {Buffer} buffer
	 */
	buffer() {
		const source = this.source();
		if (Buffer.isBuffer(source)) return source;
		return Buffer.from(source, "utf8");
	}

	/**
	 * @returns {Buffer[]} buffers
	 */
	buffers() {
		return [this.buffer()];
	}

	/**
	 * @returns {number} size
	 */
	size() {
		return this.buffer().length;
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
	 * @param {MapOptions=} options map options
	 * @returns {SourceAndMap} source and map
	 */
	sourceAndMap(options) {
		return {
			source: this.source(),
			map: this.map(options),
		};
	}

	/**
	 * @param {HashLike} hash hash
	 * @returns {void}
	 */
	// eslint-disable-next-line no-unused-vars
	updateHash(hash) {
		throw new Error("Abstract");
	}
}

module.exports = Source;
