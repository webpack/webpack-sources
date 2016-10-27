/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { SourceNode } from 'source-map'
import { SourceListMap } from 'source-list-map'
import Source = require('./Source');

class LineToLineMappedSource extends Source {
    _value: string
    _name: string
    _originalSource: string

    constructor(value, name, originalSource) {
        super();
        this._value = value;
        this._name = name;
        this._originalSource = originalSource;
    }

    source() {
        return this._value;
    }

    node(options) {
        const value = this._value;
        const name = this._name;
        const lines = value.split('\n');
        const node = new SourceNode(null, null, null, lines.map((
            line,
            idx
        ) => new SourceNode(idx + 1, 0, name, line + (idx !== lines.length - 1 ? '\n' : ''))));
        node.setSourceContent(name, this._originalSource);
        return node;
    }

    listMap(options) {
        return new SourceListMap(this._value, this._name, this._originalSource);
    }

    updateHash(hash) {
        hash.update(this._value);
        hash.update(this._originalSource);
    }
}

export = LineToLineMappedSource;

require('./SourceAndMapMixin')(LineToLineMappedSource.prototype);
