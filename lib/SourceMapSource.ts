/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { SourceNode, SourceMapConsumer, SourceMapGenerator, RawSourceMap } from 'source-map'
import { SourceListMap, fromStringWithSourceMap } from 'source-list-map'
import Source = require('./Source');
import { Hash } from 'crypto'

class SourceMapSource extends Source {
    _value: string
    _name: string
    _sourceMap: SourceMapGenerator | RawSourceMap
    _originalSource: string
    _innerSourceMap: RawSourceMap

    constructor(value: string, name: string, sourceMap: SourceMapGenerator | RawSourceMap, originalSource: string, innerSourceMap?: RawSourceMap) {
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
            // todo: here may be some problem?
            sourceMap = SourceMapGenerator.fromSourceMap(new SourceMapConsumer(sourceMap));
            if (this._originalSource) {
                sourceMap.setSourceContent(this._name, this._originalSource);
            }
            const innerSourceMapConsumer = new SourceMapConsumer(innerSourceMap);
            sourceMap.applySourceMap(innerSourceMapConsumer, this._name);
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

    updateHash(hash: Hash) {
        hash.update(this._value);
        if (this._originalSource) {
            hash.update(this._originalSource);
        }
    }
}

export = SourceMapSource;

require('./SourceAndMapMixin')(SourceMapSource.prototype);
