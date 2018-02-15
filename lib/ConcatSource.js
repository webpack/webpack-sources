/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

const SourceNode = require("source-map").SourceNode;
const SourceListMap = require("source-list-map").SourceListMap;
const Source = require("./Source");

class ConcatSource extends Source {
	constructor() {
		super();
		this.children = [];
		Object.values(arguments).map(item => {
			item instanceof ConcatSource ? item.children.map(child => this.children.push(child)) : this.children.push(item);
		});
	}

	add(item) {
		item instanceof ConcatSource ? item.children.map(child => this.children.push(child)) : this.children.push(item);
	}

	source() {
		let source = "";
		const children = this.children;
		for(let i = 0; i < children.length; i++) {
			const child = children[i];
			source += typeof child === "string" ? child : child.source();
		}
		return source;
	}

	size() {
		let size = 0;
		const children = this.children;
		for(let i = 0; i < children.length; i++) {
			const child = children[i];
			size += typeof child === "string" ? child.length : child.size();
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
		var children = this.children;
		for(var i = 0; i < children.length; i++) {
			var item = children[i];
			typeof item === "string" ? map.add(item) : map.add(item.listMap(options));
		}
		return map;
	}

	updateHash(hash) {
		var children = this.children;
		for(var i = 0; i < children.length; i++) {
			var item = children[i];
			typeof item === "string" ? hash.update(item) : item.updateHash(hash);
		}
	}
}

require("./SourceAndMapMixin")(ConcatSource.prototype);

module.exports = ConcatSource;
