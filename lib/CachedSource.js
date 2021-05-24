/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Source = require("./Source");
const { SourceMapConsumer, SourceNode } = require("source-map");
const { SourceListMap, fromStringWithSourceMap } = require("source-list-map");

const mapToBufferedMap = map => {
	if (typeof map !== "object" || !map) return map;
	const bufferedMap = Object.assign({}, map);
	if (map.mappings) {
		bufferedMap.mappings = Buffer.from(map.mappings, "utf-8");
	}
	if (map.sourcesContent) {
		bufferedMap.sourcesContent = map.sourcesContent.map(
			str => str && Buffer.from(str, "utf-8")
		);
	}
	return bufferedMap;
};

const bufferedMapToMap = bufferedMap => {
	if (typeof bufferedMap !== "object" || !bufferedMap) return bufferedMap;
	const map = Object.assign({}, bufferedMap);
	if (bufferedMap.mappings) {
		map.mappings = bufferedMap.mappings.toString("utf-8");
	}
	if (bufferedMap.sourcesContent) {
		map.sourcesContent = bufferedMap.sourcesContent.map(
			buffer => buffer && buffer.toString("utf-8")
		);
	}
	return map;
};

class CachedSource extends Source {
	constructor(source, cachedData) {
		super();
		this._source = source;
		this._cachedSourceType = cachedData ? cachedData.source : undefined;
		this._cachedSource = undefined;
		this._cachedBuffer = cachedData ? cachedData.buffer : undefined;
		this._cachedSize = cachedData ? cachedData.size : undefined;
		this._cachedMaps = cachedData ? cachedData.maps : new Map();
		this._cachedHashUpdate = cachedData ? cachedData.hash : undefined;
	}

	getCachedData() {
		// We don't want to cache strings
		// So if we have a caches sources
		// create a buffer from it and only store
		// if it was a Buffer or string
		if (this._cachedSource) {
			this.buffer();
		}
		const bufferedMaps = new Map();
		for (const pair of this._cachedMaps) {
			let cacheEntry = pair[1];
			if (cacheEntry.bufferedMap === undefined) {
				if (cacheEntry.map === undefined) {
					continue;
				}
				cacheEntry.bufferedMap = mapToBufferedMap(cacheEntry.map);
			}
			bufferedMaps.set(pair[0], {
				map: undefined,
				node: undefined,
				listMap: undefined,
				bufferedMap: cacheEntry.bufferedMap
			});
		}
		return {
			buffer: this._cachedBuffer,
			source:
				this._cachedSourceType !== undefined
					? this._cachedSourceType
					: typeof this._cachedSource === "string"
					? true
					: Buffer.isBuffer(this._cachedSource)
					? false
					: undefined,
			size: this._cachedSize,
			maps: bufferedMaps,
			hash: this._cachedHashUpdate
		};
	}

	originalLazy() {
		return this._source;
	}

	original() {
		if (typeof this._source === "function") this._source = this._source();
		return this._source;
	}

	source() {
		if (this._cachedSource !== undefined) return this._cachedSource;
		if (this._cachedBuffer && this._cachedSourceType !== undefined) {
			return (this._cachedSource = this._cachedSourceType
				? this._cachedBuffer.toString("utf-8")
				: this._cachedBuffer);
		} else {
			return (this._cachedSource = this.original().source());
		}
	}

	buffer() {
		if (typeof this._cachedBuffer !== "undefined") return this._cachedBuffer;
		if (typeof this._cachedSource !== "undefined") {
			if (Buffer.isBuffer(this._cachedSource)) {
				return (this._cachedBuffer = this._cachedSource);
			}
			return (this._cachedBuffer = Buffer.from(this._cachedSource, "utf-8"));
		}
		if (typeof this.original().buffer === "function") {
			return (this._cachedBuffer = this.original().buffer());
		}
		const bufferOrString = this.source();
		if (Buffer.isBuffer(bufferOrString)) {
			return (this._cachedBuffer = bufferOrString);
		}
		return (this._cachedBuffer = Buffer.from(bufferOrString, "utf-8"));
	}

	size() {
		if (typeof this._cachedSize !== "undefined") return this._cachedSize;
		if (typeof this._cachedSource !== "undefined") {
			return (this._cachedSize = Buffer.byteLength(this._cachedSource));
		}
		if (typeof this._cachedBuffer !== "undefined") {
			return (this._cachedSize = this._cachedBuffer.length);
		}
		return (this._cachedSize = this.original().size());
	}

	sourceAndMap(options) {
		const key = options ? JSON.stringify(options) : "{}";
		const cacheEntry = this._cachedMaps.get(key);
		if (
			cacheEntry !== undefined &&
			cacheEntry.map === undefined &&
			cacheEntry.bufferedMap !== undefined
		) {
			cacheEntry.map = bufferedMapToMap(cacheEntry.bufferedMap);
		}

		let source, map;
		if (cacheEntry === undefined || cacheEntry.map === undefined) {
			if (typeof this._cachedSource !== "undefined") {
				// The source is already known so only compute the map.
				source = this._cachedSource;
				map = this.original().map(options);
			} else {
				// The source is not yet known so compute the source and map together.
				const sourceAndMap = this.original().sourceAndMap(options);
				source = sourceAndMap.source;
				map = sourceAndMap.map;
				this._cachedSource = source;
			}

			if (cacheEntry === undefined) {
				this._cachedMaps.set(key, {
					map,
					node: undefined,
					listMap: undefined,
					bufferedMap: undefined
				});
			} else {
				cacheEntry.map = map;
			}
		} else {
			// The map is already cached.
			source = this.source();
			map = cacheEntry.map;
		}
		return { source, map };
	}

	node(options) {
		const key = options ? JSON.stringify(options) : "{}";
		let cacheEntry = this._cachedMaps.get(key);
		if (cacheEntry === undefined || cacheEntry.node === undefined) {
			const original = this.original();
			let node;

			if (
				typeof original.node === "function" &&
				(cacheEntry === undefined ||
					(cacheEntry.map === undefined &&
						cacheEntry.bufferedMap === undefined))
			) {
				// The original source is able to provide a node and a cached map is not
				// available, so the node is obtained by requesting it from the original
				// source.
				node = original.node(options);
			} else {
				const sourceAndMap = this.sourceAndMap(options);
				if (sourceAndMap.map) {
					node = SourceNode.fromStringWithSourceMap(
						sourceAndMap.source,
						new SourceMapConsumer(sourceAndMap.map)
					);
				} else {
					node = new SourceNode(null, null, null, sourceAndMap.source);
				}
				// Refresh the cache entry as it may have been primed in `sourceAndMap`.
				cacheEntry = this._cachedMaps.get(key);
			}

			if (cacheEntry === undefined) {
				this._cachedMaps.set(key, {
					map: undefined,
					node,
					listMap: undefined,
					bufferedMap: undefined
				});
			} else {
				cacheEntry.node = node;
			}
			return node;
		} else {
			return cacheEntry.node;
		}
	}

	listMap(options) {
		const key = options ? JSON.stringify(options) : "{}";
		let cacheEntry = this._cachedMaps.get(key);
		if (cacheEntry === undefined || cacheEntry.listMap === undefined) {
			const original = this.original();
			let listMap;

			if (
				typeof original.listMap === "function" &&
				(cacheEntry === undefined ||
					(cacheEntry.map === undefined &&
						cacheEntry.bufferedMap === undefined))
			) {
				// The original source is able to provide a list map and a cached map is
				// not available, so the list map is obtained by requesting it from the
				// original source.
				listMap = original.listMap(options);
			} else {
				const sourceAndMap = this.sourceAndMap(options);
				if (sourceAndMap.map) {
					listMap = fromStringWithSourceMap(
						sourceAndMap.source,
						sourceAndMap.map
					);
				} else {
					listMap = new SourceListMap(sourceAndMap.source);
				}
				// Refresh the cache entry as it may have been primed in `sourceAndMap`.
				cacheEntry = this._cachedMaps.get(key);
			}

			if (cacheEntry === undefined) {
				this._cachedMaps.set(key, {
					map: undefined,
					node: undefined,
					listMap,
					bufferedMap: undefined
				});
			} else {
				cacheEntry.listMap = listMap;
			}

			return listMap;
		} else {
			return cacheEntry.listMap;
		}
	}

	map(options) {
		const key = options ? JSON.stringify(options) : "{}";
		const cacheEntry = this._cachedMaps.get(key);
		if (
			cacheEntry !== undefined &&
			cacheEntry.map === undefined &&
			cacheEntry.bufferedMap !== undefined
		) {
			cacheEntry.map = bufferedMapToMap(cacheEntry.bufferedMap);
		}
		if (cacheEntry !== undefined && cacheEntry.map !== undefined) {
			return cacheEntry.map;
		}
		const map = this.original().map(options);
		this._cachedMaps.set(key, {
			map,
			node: undefined,
			listMap: undefined,
			bufferedMap: undefined
		});
		return map;
	}

	updateHash(hash) {
		if (this._cachedHashUpdate !== undefined) {
			for (const item of this._cachedHashUpdate) hash.update(item);
			return;
		}
		const update = [];
		let currentString = undefined;
		const tracker = {
			update: item => {
				if (typeof item === "string" && item.length < 10240) {
					if (currentString === undefined) {
						currentString = item;
					} else {
						currentString += item;
						if (currentString > 102400) {
							update.push(Buffer.from(currentString));
							currentString = undefined;
						}
					}
				} else {
					if (currentString !== undefined) {
						update.push(Buffer.from(currentString));
						currentString = undefined;
					}
					update.push(item);
				}
			}
		};
		this.original().updateHash(tracker);
		if (currentString !== undefined) {
			update.push(Buffer.from(currentString));
		}
		for (const item of update) hash.update(item);
		this._cachedHashUpdate = update;
	}
}

module.exports = CachedSource;
