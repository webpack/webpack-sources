/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const SourceNode = require("source-map").SourceNode;
const SourceListMap = require("source-list-map").SourceListMap;
const Source = require("./Source");

class ConcatSource extends Source {
	constructor() {
		super();
		this.children = Array.prototype.slice.call(arguments);
	}

	add(item) {
		this.children.push(item);
	}

	source() {
		let source = "";
		for(let i = 0, len = this.children.length; i < len; ++i) {
			const child = this.children[i];
			source += (typeof child === "string") ? child : child.source();
		}
		return source;
	}

	size() {
		let size = 0;
		for(let i = 0, len = this.children.length; i < len; ++i) {
			const child = this.children[i];
			size += (typeof child === "string") ? child.length : child.size();
		}
		return size;
	}

	node(options) {
		const node = new SourceNode(null, null, null, this.children.map(function(item) {
			return typeof item === "string" ? item : item.node(options);
		}));
		return node;
	}

	listMap(options) {
		const map = new SourceListMap();
		this.children.forEach(function(item) {
			if(typeof item === "string")
				map.add(item);
			else
				map.add(item.listMap(options));
		});
		return map;
	}

	updateHash(hash) {
		this.children.forEach(function(item) {
			if(typeof item === "string")
				hash.update(item);
			else
				item.updateHash(hash);
		});
	}
}

require("./SourceAndMapMixin")(ConcatSource.prototype);

module.exports = ConcatSource;
