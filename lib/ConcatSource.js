/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

// TODO: "require->import"
const SourceNode = require("source-map").SourceNode;
const SourceListMap = require("source-list-map").SourceListMap;
const Source = require("./Source");

class ConcatSource extends Source {
	constructor() {
		super();
		this.children = [];
		// TODO: "misc" higher-order functions
		for(var i = 0; i < arguments.length; i++) {
			var item = arguments[i];
			// TODO: "ternary-conditonals"
			// TODO: "misc" higher-order functions (reduce ?)
			if(item instanceof ConcatSource) {
				var children = item.children;
				for(var j = 0; j < children.length; j++)
					this.children.push(children[j]);
			} else {
				this.children.push(item);
			}
		}
	}

	add(item) {
		// TODO: "ternary-conditonals"
		// TODO: "misc" higher-order functions (reduce ?)
		if(item instanceof ConcatSource) {
			var children = item.children;
			// TODO: "misc" map function
			for(var j = 0; j < children.length; j++)
				this.children.push(children[j]);
		} else {
			this.children.push(item);
		}
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
