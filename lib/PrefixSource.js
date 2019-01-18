/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Source = require("./Source");
const { SourceNode } = require("source-map");
const { getSourceAndMap, getMap } = require("./helpers");

const REPLACE_REGEX = /\n(?=.|\s)/g;

function cloneAndPrefix(node, prefix, append) {
	if (typeof node === "string") {
		let result = node.replace(REPLACE_REGEX, "\n" + prefix);
		if (append.length > 0) result = append.pop() + result;
		if (/\n$/.test(node)) append.push(prefix);
		return result;
	} else {
		const newNode = new SourceNode(
			node.line,
			node.column,
			node.source,
			node.children.map(function(node) {
				return cloneAndPrefix(node, prefix, append);
			}),
			node.name
		);
		newNode.sourceContents = node.sourceContents;
		return newNode;
	}
}

class PrefixSource extends Source {
	constructor(prefix, source) {
		super();
		this._source = source;
		this._prefix = prefix;
	}

	source() {
		const node =
			typeof this._source === "string" ? this._source : this._source.source();
		const prefix = this._prefix;
		return prefix + node.replace(REPLACE_REGEX, "\n" + prefix);
	}

	map(options) {
		return getMap(this, options);
	}

	sourceAndMap(options) {
		return getSourceAndMap(this, options);
	}

	node(options) {
		const node = this._source.node(options);
		const append = [this._prefix];
		return new SourceNode(null, null, null, [
			cloneAndPrefix(node, this._prefix, append)
		]);
	}

	listMap(options) {
		const prefix = this._prefix;
		const map = this._source.listMap(options);
		let prefixNextLine = true;
		return map.mapGeneratedCode(function(code) {
			let updatedCode = code.replace(REPLACE_REGEX, "\n" + prefix);
			if (prefixNextLine) updatedCode = prefix + updatedCode;
			prefixNextLine = code.charCodeAt(code.length - 1) === 10; // === /\n$/.test(code)
			return updatedCode;
		});
	}

	updateHash(hash) {
		hash.update("PrefixSource");
		if (typeof this._source === "string") hash.update(this._source);
		else this._source.updateHash(hash);
		hash.update(this._prefix);
	}
}

module.exports = PrefixSource;
