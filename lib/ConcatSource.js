/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var SourceNode = require("source-map").SourceNode;
var SourceListMap = require("source-list-map").SourceListMap;
var Source = require("./Source");

function ConcatSource() {
	Source.call(this);
	this.children = Array.prototype.slice.call(arguments);
}
module.exports = ConcatSource;

ConcatSource.prototype = Object.create(Source.prototype);
ConcatSource.prototype.constructor = ConcatSource;

ConcatSource.prototype.add = function(item) {
	this.children.push(item);
};

ConcatSource.prototype.source = function() {
	var source = '';

	var children = this.children;
	for(var i = 0, l = children.length; i < l; ++i) {
		var item = children[i];
		source += typeof item === "string" ? item : item.source();
	}

	return source;
};

ConcatSource.prototype.size = function() {
	var size = 0;

	var children = this.children;
	for(var i = 0, l = children.length; i < l; ++i) {
		var item = children[i];
		size += typeof item === "string" ? item.length : item.size();
	}

	return size;
};

require("./SourceAndMapMixin")(ConcatSource.prototype);

ConcatSource.prototype.node = function(options) {
	var chunks = [];

	var children = this.children;
	for(var i = 0, l = children.length; i < l; ++i) {
		var item = children[i];
		chunks.push(typeof item === "string" ? item : item.node(options));
	}

	return new SourceNode(null, null, null, chunks);
};

ConcatSource.prototype.listMap = function(options) {
	var map = new SourceListMap();

	var children = this.children;
	for(var i = 0, l = children.length; i < l; ++i) {
		var item = children[i];
		map.add(typeof item === "string" ? item : item.listMap(options));
	}

	return map;
};

ConcatSource.prototype.updateHash = function(hash) {
	var children = this.children;
	for(var i = 0, l = children.length; i < l; ++i) {
		var item = children[i];
		if(typeof item === "string") {
			hash.update(item);
		} else {
			item.updateHash(hash);
		}
	}
};
