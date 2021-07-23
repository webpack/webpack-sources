/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Source = require("./Source");
const RawSource = require("./RawSource");
const streamChunks = require("./helpers/streamChunks");
const { getMap, getSourceAndMap } = require("./helpers/getFromStreamChunks");

const REPLACE_REGEX = /\n(?=.|\s)/g;

class PrefixSource extends Source {
	constructor(prefix, source) {
		super();
		this._source =
			typeof source === "string" || Buffer.isBuffer(source)
				? new RawSource(source, true)
				: source;
		this._prefix = prefix;
	}

	getPrefix() {
		return this._prefix;
	}

	original() {
		return this._source;
	}

	source() {
		const node = this._source.source();
		const prefix = this._prefix;
		return prefix + node.replace(REPLACE_REGEX, "\n" + prefix);
	}

	// TODO efficient buffer() implementation

	map(options) {
		return getMap(this, options);
	}

	sourceAndMap(options) {
		return getSourceAndMap(this, options);
	}

	streamChunks(options, onChunk, onSource, onName) {
		const prefix = this._prefix;
		const prefixOffset = prefix.length;
		let lastLine = 0;
		const linesOnly = !!(options && options.columns === false);
		const { generatedLine, generatedColumn } = streamChunks(
			this._source,
			options,
			(
				chunk,
				generatedLine,
				generatedColumn,
				sourceIndex,
				originalLine,
				originalColumnn,
				nameIndex
			) => {
				if (generatedLine !== lastLine) {
					lastLine = generatedLine;
					if (linesOnly || sourceIndex < 0) {
						chunk = prefix + chunk;
					} else {
						onChunk(prefix, generatedLine, generatedColumn, -1, -1, -1, -1);
						generatedColumn += prefixOffset;
					}
				} else {
					generatedColumn += prefixOffset;
				}
				onChunk(
					chunk,
					generatedLine,
					generatedColumn,
					sourceIndex,
					originalLine,
					originalColumnn,
					nameIndex
				);
			},
			onSource,
			onName
		);
		return {
			generatedLine,
			generatedColumn:
				generatedColumn === 0 ? 0 : prefixOffset + generatedColumn
		};
	}

	updateHash(hash) {
		hash.update("PrefixSource");
		this._source.updateHash(hash);
		hash.update(this._prefix);
	}
}

module.exports = PrefixSource;
