/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Source = require("./Source");

/** @typedef {import("./Source").Hash} Hash */
/** @typedef {import("./Source").MapOptions} MapOptions */
/** @typedef {import("./Source").RawSourceMap} RawSourceMap */
/** @typedef {import("./Source").SourceValue} SourceValue */

class SizeOnlySource extends Source {
	/**
	 * @param {number} size size
	 */
	constructor(size) {
		super();
		this._size = size;
	}

	_error() {
		return new Error(
			"Content and Map of this Source is not available (only size() is supported)"
		);
	}

	size() {
		return this._size;
	}

	/**
	 * @returns {SourceValue} source
	 */
	source() {
		throw this._error();
	}

	/**
	 * @returns {Buffer} buffer
	 */
	buffer() {
		throw this._error();
	}

	/**
	 * @param {MapOptions=} options map options
	 * @returns {RawSourceMap | null} map
	 */
	map(options) {
		throw this._error();
	}

	/**
	 * @param {Hash} hash hash
	 * @returns {void}
	 */
	updateHash(hash) {
		throw this._error();
	}
}

module.exports = SizeOnlySource;
