/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Source = require('./Source');

import { SourceNode } from 'source-map'
import { SourceListMap } from 'source-list-map'

class RawSource extends Source {
    _value: string

    constructor(value) {
        super();
        this._value = value;
    }

    source() {
        return this._value;
    }

    map(options) {
        return null;
    }

    node(options) {
        return new SourceNode(null, null, null, this._value);
    }

    listMap(options) {
        return new SourceListMap(this._value);
    }

    updateHash(hash) {
        hash.update(this._value);
    }
}

export = RawSource;
