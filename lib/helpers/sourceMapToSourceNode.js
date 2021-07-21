/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SourceNode } = require("source-map");
const streamChunksOfSourceMap = require("./streamChunksOfSourceMap");

const sourceMapToSourceNode = (source, sourceMap) => {
	const node = new SourceNode();
	const sources = [];
	const names = [];
	streamChunksOfSourceMap(
		source,
		sourceMap,
		(
			chunk,
			generatedLine,
			generatedColumn,
			sourceIndex,
			originalLine,
			originalColumnn,
			nameIndex
		) => {
			if (sourceIndex < 0) {
				node.add(chunk);
			} else {
				node.add(
					new SourceNode(
						originalLine,
						originalColumnn,
						sources[sourceIndex],
						chunk,
						nameIndex < 0 ? null : names[nameIndex]
					)
				);
			}
		},
		(i, source, sourceContent) => {
			sources[i] = source;
			if (sourceContent) {
				node.setSourceContent(source, sourceContent);
			}
		},
		(i, name) => {
			names[i] = name;
		}
	);
	return node;
};

module.exports = sourceMapToSourceNode;
