/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const { SourceNode } = require("source-map");
const { SourceListMap, fromStringWithSourceMap } = require("source-list-map");
const sourceMapToSourceNode = require("./helpers/sourceMapToSourceNode");
const createMappingsSerializer = require("./helpers/createMappingsSerializer");
const streamChunksOfSourceMap = require("./helpers/streamChunksOfSourceMap");

exports.getSourceAndMap = (inputSource, options) => {
	if (typeof inputSource.streamChunks === "function") {
		let code = "";
		let mappings = "";
		let sources = [];
		let sourcesContent = [];
		let names = [];
		const addMapping = createMappingsSerializer();
		inputSource.streamChunks(
			options,
			(
				chunk,
				generatedLine,
				generatedColumn,
				sourceIndex,
				originalLine,
				originalColumn,
				nameIndex
			) => {
				code += chunk;
				mappings += addMapping(
					generatedLine,
					generatedColumn,
					sourceIndex,
					originalLine,
					originalColumn,
					nameIndex
				);
			},
			(sourceIndex, source, sourceContent) => {
				while (sources.length < sourceIndex) {
					sources.push(null);
				}
				sources[sourceIndex] = source;
				if (sourceContent !== undefined) {
					while (sourcesContent.length < sourceIndex) {
						sourcesContent.push(null);
					}
					sourcesContent[sourceIndex] = sourceContent;
				}
			},
			(nameIndex, name) => {
				while (names.length < nameIndex) {
					names.push(null);
				}
				names[nameIndex] = name;
			}
		);
		return {
			source: code,
			map:
				mappings.length > 0
					? {
							version: 3,
							file: "x",
							mappings,
							sources,
							sourcesContent:
								sourcesContent.length > 0 ? sourcesContent : undefined,
							names
					  }
					: null
		};
	}
	let source;
	let map;
	if (options && options.columns === false) {
		const res = inputSource.listMap(options).toStringWithSourceMap({
			file: "x"
		});
		source = res.source;
		map = res.map;
	} else {
		const res = inputSource.node(options).toStringWithSourceMap({
			file: "x"
		});
		source = res.code;
		map = res.map.toJSON();
	}
	if (!map || !map.sources || map.sources.length === 0) map = null;

	return {
		source,
		map
	};
};

exports.getMap = (source, options) => {
	if (typeof source.streamChunks === "function") {
		let mappings = "";
		let sources = [];
		let sourcesContent = [];
		let names = [];
		const addMapping = createMappingsSerializer();
		source.streamChunks(
			options,
			(
				chunk,
				generatedLine,
				generatedColumn,
				sourceIndex,
				originalLine,
				originalColumn,
				nameIndex
			) => {
				mappings += addMapping(
					generatedLine,
					generatedColumn,
					sourceIndex,
					originalLine,
					originalColumn,
					nameIndex
				);
			},
			(sourceIndex, source, sourceContent) => {
				while (sources.length < sourceIndex) {
					sources.push(null);
				}
				sources[sourceIndex] = source;
				if (sourceContent !== undefined) {
					while (sourcesContent.length < sourceIndex) {
						sourcesContent.push(null);
					}
					sourcesContent[sourceIndex] = sourceContent;
				}
			},
			(nameIndex, name) => {
				while (names.length < nameIndex) {
					names.push(null);
				}
				names[nameIndex] = name;
			}
		);
		return mappings.length > 0
			? {
					version: 3,
					file: "x",
					mappings,
					sources,
					sourcesContent:
						sourcesContent.length > 0 ? sourcesContent : undefined,
					names
			  }
			: null;
	}
	let map;
	if (options && options.columns === false) {
		map = source.listMap(options).toStringWithSourceMap({
			file: "x"
		}).map;
	} else {
		map = source
			.node(options)
			.toStringWithSourceMap({
				file: "x"
			})
			.map.toJSON();
	}
	if (!map || !map.sources || map.sources.length === 0) return null;
	return map;
};

exports.getNode = (source, options) => {
	if (typeof source.node === "function") {
		return source.node(options);
	} else {
		const sourceAndMap = source.sourceAndMap(options);
		if (sourceAndMap.map) {
			return sourceMapToSourceNode(sourceAndMap.source, sourceAndMap.map);
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

exports.streamChunks = (source, options, onChunk, onSource, onName) => {
	if (typeof source.streamChunks === "function") {
		source.streamChunks(options, onChunk, onSource, onName);
	} else {
		const sourceAndMap = source.sourceAndMap(options);
		streamChunksOfSourceMap(
			sourceAndMap.source,
			sourceAndMap.map,
			onChunk,
			onSource,
			onName
		);
	}
};
