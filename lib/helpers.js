/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const { SourceNode, SourceMapConsumer } = require("source-map");
const { SourceListMap, fromStringWithSourceMap } = require("source-list-map");

exports.getSourceAndMap = (source, options) => {
	if (options && options.columns === false) {
		return source.listMap(options).toStringWithSourceMap({
			file: "x"
		});
	}

	const res = source.node(options).toStringWithSourceMap({
		file: "x"
	});
	return {
		source: res.code,
		map: res.map.toJSON()
	};
};

exports.getMap = (source, options) => {
	if (options && options.columns === false) {
		return source.listMap(options).toStringWithSourceMap({
			file: "x"
		}).map;
	}

	return source
		.node(options)
		.toStringWithSourceMap({
			file: "x"
		})
		.map.toJSON();
};

exports.getNode = (source, options) => {
	if (typeof source.node === "function") {
		return source.node(options);
	} else {
		const sourceAndMap = source.sourceAndMap(options);
		if (sourceAndMap.map) {
			return SourceNode.fromStringWithSourceMap(
				sourceAndMap.source,
				new SourceMapConsumer(sourceAndMap.map)
			);
		} else {
			return new SourceNode(null, null, null, sourceAndMap.source);
		}
	}
};

exports.getListMap = (source, options) => {
	if (typeof source.listMap === "function") {
		return source.listMap(options);
	} else {
		const sourceAndMap = source.sourceAndMap(options);
		if (sourceAndMap.map) {
			return fromStringWithSourceMap(sourceAndMap.source, sourceAndMap.map);
		} else {
			return new SourceListMap(sourceAndMap.source);
		}
	}
};
