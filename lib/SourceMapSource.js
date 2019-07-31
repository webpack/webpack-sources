/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Source = require("./Source");
const { SourceNode, SourceMapConsumer } = require("source-map");
const { SourceListMap, fromStringWithSourceMap } = require("source-list-map");
const { getSourceAndMap, getMap } = require("./helpers");
const applySourceMap = require("./applySourceMap");

class SourceMapSource extends Source {
	constructor(
		value,
		name,
		sourceMap,
		originalSource,
		innerSourceMap,
		removeOriginalSource
	) {
		super();
		this._value = value;
		this._name = name;
		this._sourceMap = sourceMap;
		this._originalSource = originalSource;
		this._innerSourceMap = innerSourceMap;
		this._removeOriginalSource = removeOriginalSource;
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
		const sourceMap = this._sourceMap;
		let node = SourceNode.fromStringWithSourceMap(
			this._value,
			new SourceMapConsumer(sourceMap)
		);
		node.setSourceContent(this._name, this._originalSource);
		const innerSourceMap = this._innerSourceMap;
		if (innerSourceMap) {
			node = applySourceMap(
				node,
				new SourceMapConsumer(innerSourceMap),
				this._name,
				this._removeOriginalSource
			);
		}
		return node;
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
