/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Source = require('./Source')
import { RawSourceMap } from 'source-map'
import { Hash } from 'crypto'
import { SourceListMap, SourceNode } from 'source-list-map'

class CachedSource {
    _source: Source
    _cachedSource: string
    _cachedSize: number
    _cachedMaps: {
        [prop: string]: RawSourceMap
    }
    node: (options) => SourceNode
    listMap: (options) => SourceListMap

    constructor(source: Source) {
        this._source = source;
        this._cachedSource = undefined;
        this._cachedSize = undefined;
        this._cachedMaps = {};

        if (source.node) {
            this.node = function (options) {
                return this._source.node(options);
            };
        }

        if (source.listMap) {
            this.listMap = function (options) {
                return this._source.listMap(options);
            };
        }
    }

    source() {
        if (typeof this._cachedSource !== 'undefined') {
            return this._cachedSource;
        }
        return this._cachedSource = this._source.source();
    }

    size() {
        if (typeof this._cachedSize !== 'undefined') {
            return this._cachedSize;
        }
        if (typeof this._cachedSource !== 'undefined') {
            return this._cachedSize = this._cachedSource.length;
        }
        return this._cachedSize = this._source.size();
    }

    sourceAndMap(options) {
        const key = JSON.stringify(options);
        if (typeof this._cachedSource !== 'undefined' && key in this._cachedMaps) {
            return {
                source: this._cachedSource,
                map: this._cachedMaps[key]
            };
        }
        else if (typeof this._cachedSource !== 'undefined') {
            return {
                source: this._cachedSource,
                map: this._cachedMaps[key] = this._source.map(options)
            };
        }
        else if (key in this._cachedMaps) {
            return {
                source: this._cachedSource = this._source.source(),
                map: this._cachedMaps[key]
            };
        }
        const result = this._source.sourceAndMap(options);
        this._cachedSource = result.source;
        this._cachedMaps[key] = result.map;
        return {
            source: this._cachedSource,
            map: this._cachedMaps[key]
        };
    }

    map(options) {
        if (!options) {
            options = {};
        }
        const key = JSON.stringify(options);
        if (key in this._cachedMaps) {
            return this._cachedMaps[key];
        }
        return this._cachedMaps[key] = this._source.map();
    }

    updateHash(hash: Hash) {
        this._source.updateHash(hash);
    }
}

export = CachedSource;
