/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Source = require("./Source");
const {
	SourceNode,
	SourceMapConsumer,
	SourceMapGenerator
} = require("source-map");
const { SourceListMap, fromStringWithSourceMap } = require("source-list-map");
const { getSourceAndMap, getMap } = require("./helpers");

class SourceMapSource extends Source {
	constructor(value, name, sourceMap, originalSource, innerSourceMap) {
		super();
		this._value = value;
		this._name = name;
		this._sourceMap = sourceMap;
		this._originalSource = originalSource;
		this._innerSourceMap = innerSourceMap;
	}

	source() {
		return this._value;
	}

	map(options) {
		if (!this._innerSourceMap) {
			return typeof this._sourceMap === "string"
				? JSON.parse(this._sourceMap)
				: this._sourceMap;
		}
		return getMap(this, options);
	}

	sourceAndMap(options) {
		if (!this._innerSourceMap) {
			return {
				source: this._value,
				map:
					typeof this._sourceMap === "string"
						? JSON.parse(this._sourceMap)
						: this._sourceMap
			};
		}
		return getSourceAndMap(this, options);
	}

	node(options) {
		const innerSourceMap = this._innerSourceMap;
		let sourceMap = this._sourceMap;
		if (innerSourceMap) {
			const sourceMapGen = SourceMapGenerator.fromSourceMap(
				new SourceMapConsumer(sourceMap)
			);
			if (this._originalSource)
				sourceMapGen.setSourceContent(this._name, this._originalSource);
			const innerSourceMapConsumer = new SourceMapConsumer(innerSourceMap);
			sourceMapGen.applySourceMap(innerSourceMapConsumer, this._name);
			sourceMap = sourceMapGen.toJSON();
		}
		return SourceNode.fromStringWithSourceMap(
			this._value,
			new SourceMapConsumer(sourceMap)
		);
	}

	listMap(options) {
		options = options || {};
		if (options.module === false)
			return new SourceListMap(this._value, this._name, this._value);
		return fromStringWithSourceMap(
			this._value,
			typeof this._sourceMap === "string"
				? JSON.parse(this._sourceMap)
				: this._sourceMap
		);
	}

	updateHash(hash) {
		hash.update(this._value);
		if (this._originalSource) hash.update(this._originalSource);
	}
}

module.exports = SourceMapSource;
