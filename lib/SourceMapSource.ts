/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { SourceNode, SourceMapConsumer, SourceMapGenerator } from 'source-map'
import { SourceListMap, fromStringWithSourceMap } from 'source-list-map'
import Source = require('./Source');

class SourceMapSource extends Source {
    _value: string
    _name: string
    _sourceMap: any
    _originalSource: Source
    _innerSourceMap: any

    constructor(value: string, name: string, sourceMap: any, originalSource: Source, innerSourceMap: any) {
        super();
        this._value = value;
        this._name = name;
        this._sourceMap = sourceMap;
        this._originalSource = originalSource;
        this._innerSourceMap = innerSourceMap;
    }

    source() {
        return this._value;
    }

    node() {
        let innerSourceMap = this._innerSourceMap;
        let sourceMap = this._sourceMap;
        if (innerSourceMap) {
            sourceMap = SourceMapGenerator.fromSourceMap(new SourceMapConsumer(sourceMap));
            if (this._originalSource) {
                sourceMap.setSourceContent(this._name, this._originalSource);
            }
            innerSourceMap = new SourceMapConsumer(innerSourceMap);
            sourceMap.applySourceMap(innerSourceMap, this._name);
            sourceMap = sourceMap.toJSON();
        }
        return SourceNode.fromStringWithSourceMap(this._value, new SourceMapConsumer(sourceMap));
    }

    listMap(options: { module?: boolean }) {
        if (options.module === false) {
            return new SourceListMap(this._value, this._name, this._value);
        }
        return fromStringWithSourceMap(this._value, typeof this._sourceMap === 'string'
            ? JSON.parse(this._sourceMap)
            : this._sourceMap);
    }

    updateHash(hash) {
        hash.update(this._value);
        if (this._originalSource) {
            hash.update(this._originalSource);
        }
    }
}

export = SourceMapSource;

require('./SourceAndMapMixin')(SourceMapSource.prototype);
