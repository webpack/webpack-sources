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
 * @property {string[]=} originalScopes per-source original scopes (Source Map Scopes Proposal)
 * @property {string=} generatedRanges generated ranges (Source Map Scopes Proposal)
 */

/** @typedef {[sourceIndex: number, scopeIndex: number]} DefinitionReference */

/** @typedef {[sourceIndex: number, line: number, column: number]} Callsite */

/**
 * One entry per binding: `[expressionIndex, ...subranges]`, where each
 * subrange is `[lineDelta, columnDelta, nameIndex]`.
 * @typedef {number[]} Binding
 */

/**
 * Scope Proposal: called for each original scope boundary. `flags >= 0`
 * represents the start of a scope; `flags === -1` represents the end.
 * @callback OnOriginalScope
 * @param {number} sourceIndex source index
 * @param {number} line line
 * @param {number} column column
 * @param {number} flags flags (>= 0 start, -1 end)
 * @param {number} kind scope kind
 * @param {number} name name index (-1 if absent)
 * @param {number[]} variables variable name indices
 * @returns {void}
 */

/**
 * Scope Proposal: called for each generated range boundary. `flags >= 0`
 * represents the start of a range; `flags === -1` represents the end.
 * @callback OnGeneratedRange
 * @param {number} generatedLine generated line
 * @param {number} generatedColumn generated column
 * @param {number} flags flags (>= 0 start, -1 end)
 * @param {DefinitionReference | undefined} definition definition reference
 * @param {Callsite | undefined} callsite callsite (for inlined ranges)
 * @param {Binding[] | undefined} bindings bindings
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
