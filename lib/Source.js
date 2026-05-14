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

/**
 * @typedef {object} ClearCacheOptions
 * @property {boolean=} maps drop cached source maps (default `true`)
 * @property {boolean=} source drop cached source/buffer copies (default `true`)
 * @property {boolean=} hash drop the materialized `updateHash` payload (default `false` — cheap to hold, expensive to rebuild)
 * @property {boolean=} size drop the cached byte size (default `false` — single number, expensive to recompute)
 * @property {boolean=} recursive propagate to wrapped sources (default `true`)
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

	/**
	 * Release any cached data held by this source. Subclasses override
	 * this method; the base implementation is a no-op so every Source
	 * supports the call.
	 * Not safe to call concurrently with source/map/sourceAndMap/
	 * streamChunks/updateHash on the same instance — caches mutate and
	 * concurrent readers will see inconsistent state. Subsequent reader
	 * calls are allowed to repopulate caches; clearCache is a release,
	 * not a one-way switch. Composite sources propagate to children.
	 * When the same child is reachable via several parents (common with
	 * webpack chunks that share modules), pass a shared `visited`
	 * `WeakSet` so each subtree is walked at most once. Example:
	 * `const visited = new WeakSet(); for (const a of assets) a.source.clearCache({ recursive: false }, visited);`
	 * @param {ClearCacheOptions=} options selectors / recursion control
	 * @param {WeakSet<Source>=} visited de-duplication set shared across calls
	 * @returns {void}
	 */
	// eslint-disable-next-line no-unused-vars
	clearCache(options, visited) {}
}

module.exports = Source;
