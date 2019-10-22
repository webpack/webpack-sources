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
		this._sourceMapObject = undefined;
		this._sourceMapString = undefined;
		this._originalSource = originalSource;
		this._innerSourceMap = innerSourceMap;
		this._innerSourceMapObject = undefined;
		this._innerSourceMapString = undefined;
		this._removeOriginalSource = removeOriginalSource;
	}

	source() {
		return this._value;
	}

	map(options) {
		if (!this._innerSourceMap) {
			return (
				this._sourceMapObject ||
				(this._sourceMapObject =
					typeof this._sourceMap === "string"
						? JSON.parse(this._sourceMap)
						: this._sourceMap)
			);
		}
		return getMap(this, options);
	}

	sourceAndMap(options) {
		if (!this._innerSourceMap) {
			return {
				source: this._value,
				map:
					this._sourceMapObject ||
					(this._sourceMapObject =
						typeof this._sourceMap === "string"
							? JSON.parse(this._sourceMap)
							: this._sourceMap)
			};
		}
		return getSourceAndMap(this, options);
	}

	node(options) {
		const sourceMap =
			this._sourceMapObject ||
			(this._sourceMapObject =
				typeof this._sourceMap === "string"
					? JSON.parse(this._sourceMap)
					: this._sourceMap);
		let node = SourceNode.fromStringWithSourceMap(
			this._value,
			new SourceMapConsumer(sourceMap)
		);
		node.setSourceContent(this._name, this._originalSource);
		if (this._innerSourceMap) {
			const innerSourceMap =
				this._innerSourceMapObject ||
				(this._innerSourceMapObject =
					typeof this._innerSourceMap === "string"
						? JSON.parse(this._innerSourceMap)
						: this._innerSourceMap);
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

		const sourceMap =
			this._sourceMapObject ||
			(this._sourceMapObject =
				typeof this._sourceMap === "string"
					? JSON.parse(this._sourceMap)
					: this._sourceMap);
		return fromStringWithSourceMap(this._value, sourceMap);
	}

	updateHash(hash) {
		hash.update("SourceMapSource");

		hash.update(this._value);

		const sourceMap =
			this._sourceMapString ||
			(this._sourceMapString =
				typeof this._sourceMap === "string"
					? this._sourceMap
					: JSON.stringify(this._sourceMap));
		hash.update(sourceMap);

		if (this._originalSource) {
			hash.update(this._originalSource);
		}

		if (this._innerSourceMap) {
			const innerSourceMap =
				this._innerSourceMapString ||
				(this._innerSourceMapString =
					typeof this._innerSourceMap === "string"
						? this._innerSourceMap
						: JSON.stringify(this._innerSourceMap));
			hash.update(innerSourceMap);
		}

		hash.update(this._removeOriginalSource ? "true" : "false");
	}
}

module.exports = SourceMapSource;
