/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
// TODO: "no-strict" (?)
"use strict";

// TODO: "require->import"
const Source = require("./Source");

class CachedSource extends Source {
	constructor(source) {
		super();
		this._source = source;
		this._cachedSource = undefined;
		this._cachedSize = undefined;
		this._cachedMaps = {};

		if(source.node) this.node = options => this._source.node(options);

		if(source.listMap) this.listMap = options => this._source.listMap(options);
	}

	// TODO: "arrow-function"
	source() {
		return typeof this._cachedSource !== "undefined" ? this._cachedSource : this._cachedSource = this._source.source();
	}

	// TODO: "arrow-function"
	size() {
		if(typeof this._cachedSize !== "undefined") return this._cachedSize;
		return typeof this._cachedSource !== "undefined" ? this._cachedSize = this._cachedSource.length : this._cachedSize = this._source.size();
	}

	// TODO: "arrow-function"
	sourceAndMap(options) {
		const key = JSON.stringify(options);
		// TODO: "switch-hit" (?)
		if(typeof this._cachedSource !== "undefined" && key in this._cachedMaps)
			return {
				source: this._cachedSource,
				map: this._cachedMaps[key]
			};
		else if(typeof this._cachedSource !== "undefined") {
			return {
				source: this._cachedSource,
				map: this._cachedMaps[key] = this._source.map(options)
			};
		} else if(key in this._cachedMaps) {
			return {
				source: this._cachedSource = this._source.source(),
				map: this._cachedMaps[key]
			};
		}
		const result = this._source.sourceAndMap(options);
		this._cachedSource = result.source;
		this._cachedMaps[key] = result.map;
		return {
			source: this._cachedSource,
			map: this._cachedMaps[key]
		};
	}

	// TODO: "arrow-function"
	map(options) {
		// TODO: "misc" options = options || {};
		if(!options) options = {};
		const key = JSON.stringify(options);
		return key in this._cachedMaps ? this._cachedMaps[key] : this._source.map();
	}

	// TODO: "arrow-function"
	updateHash(hash) {
		this._source.updateHash(hash);
	}
}

// TODO: "export/default"
module.exports = CachedSource;
