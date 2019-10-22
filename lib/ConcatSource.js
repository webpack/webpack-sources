/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Source = require("./Source");
const { SourceNode, SourceMapConsumer } = require("source-map");
const { SourceListMap, fromStringWithSourceMap } = require("source-list-map");
const { getSourceAndMap, getMap } = require("./helpers");

class ConcatSource extends Source {
	constructor() {
		super();
		this.children = [];
		for (let i = 0; i < arguments.length; i++) {
			const item = arguments[i];
			if (item instanceof ConcatSource) {
				const children = item.children;
				for (let j = 0; j < children.length; j++) {
					this.children.push(children[j]);
				}
			} else {
				this.children.push(item);
			}
		}
	}

	add(item) {
		if (item instanceof ConcatSource) {
			const children = item.children;
			for (let j = 0; j < children.length; j++) {
				this.children.push(children[j]);
			}
		} else {
			this.children.push(item);
		}
	}

	buffer() {
		const buffers = [];
		let currentString = undefined;
		const children = this.children;
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			if (typeof child === "string") {
				if (currentString === undefined) {
					currentString = child;
				} else {
					currentString += child;
				}
			} else if (typeof child.buffer === "function") {
				if (currentString !== undefined) {
					buffers.push(Buffer.from(currentString, "utf-8"));
					currentString = undefined;
				}
				buffers.push(child.buffer());
			} else {
				const bufferOrString = child.source();
				if (Buffer.isBuffer(bufferOrString)) {
					if (currentString !== undefined) {
						buffers.push(Buffer.from(currentString, "utf-8"));
						currentString = undefined;
					}
					buffers.push(bufferOrString);
				} else {
					if (currentString === undefined) {
						currentString = bufferOrString;
					} else {
						currentString += bufferOrString;
					}
				}
			}
		}
		if (currentString !== undefined) {
			buffers.push(Buffer.from(currentString, "utf-8"));
		}
		return Buffer.concat(buffers);
	}

	source() {
		let source = "";
		const children = this.children;
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			source += typeof child === "string" ? child : child.source();
		}
		return source;
	}

	size() {
		let size = 0;
		const children = this.children;
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			size +=
				typeof child === "string"
					? Buffer.byteLength(child, "utf-8")
					: child.size();
		}
		return size;
	}

	map(options) {
		return getMap(this, options);
	}

	sourceAndMap(options) {
		return getSourceAndMap(this, options);
	}

	node(options) {
		const node = new SourceNode(
			null,
			null,
			null,
			this.children.map(function(item) {
				if (typeof item === "string") return item;
				if (typeof item.node === "function") return item.node(options);
				const sourceAndMap = item.sourceAndMap(options);
				if (sourceAndMap.map) {
					return SourceNode.fromStringWithSourceMap(
						sourceAndMap.source,
						new SourceMapConsumer(sourceAndMap.map)
					);
				} else {
					return sourceAndMap.source;
				}
			})
		);
		return node;
	}

	listMap(options) {
		const map = new SourceListMap();
		const children = this.children;
		for (let i = 0; i < children.length; i++) {
			const item = children[i];
			if (typeof item === "string") {
				map.add(item);
			} else if (typeof item.listMap === "function") {
				map.add(item.listMap(options));
			} else {
				const sourceAndMap = item.sourceAndMap(options);
				if (sourceAndMap.map) {
					map.add(
						fromStringWithSourceMap(sourceAndMap.source, sourceAndMap.map)
					);
				} else {
					map.add(sourceAndMap.source);
				}
			}
		}
		return map;
	}

	updateHash(hash) {
		const children = this.children;
		for (let i = 0; i < children.length; i++) {
			const item = children[i];
			if (typeof item === "string") hash.update(item);
			else item.updateHash(hash);
		}
	}
}

module.exports = ConcatSource;
