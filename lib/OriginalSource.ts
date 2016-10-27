/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { SourceNode } from 'source-map'
import { SourceListMap } from 'source-list-map'
import Source = require('./Source');

function isSplitter(c) {
    switch (c) {
        case 10: // \n
        case 13: // \r
        case 59: // ;
        case 123: // {
        case 125:
            // }
            return true;
    }
    return false;
}

function _splitCode(code) {
    const result = [];
    let i = 0;
    let j = 0;
    for (; i < code.length; i++) {
        if (isSplitter(code.charCodeAt(i))) {
            while (isSplitter(code.charCodeAt(++i)));
            result.push(code.substring(j, i));
            j = i;
        }
    }
    if (j < code.length) {
        result.push(code.substr(j));
    }
    return result;
}

class OriginalSource extends Source {
    _value: string
    _name: string

    constructor(value, name) {
        super();
        this._value = value;
        this._name = name;
    }

    source() {
        return this._value;
    }

    node(options: { columns: boolean } = {}) {
        const value = this._value;
        const name = this._name;
        const lines = value.split('\n');
        const node = new SourceNode(null, null, null, lines.map((line, idx) => {
            let pos = 0;
            if (options.columns === false) {
                const content = line + (idx !== lines.length - 1 ? '\n' : '');
                return new SourceNode(idx + 1, 0, name, content);
            }
            return new SourceNode(null, null, null, _splitCode(line + (idx !== lines.length - 1 ? '\n' : ''))
                .map(item => {
                    if (/^\s*$/.test(item)) {
                        return item;
                    }
                    const res = new SourceNode(idx + 1, pos, name, item);
                    pos += item.length;
                    return res;
                }));
        }));
        node.setSourceContent(name, value);
        return node;
    }

    listMap(options) {
        return new SourceListMap(this._value, this._name, this._value);
    }

    updateHash(hash) {
        hash.update(this._value);
    }
}

export = OriginalSource;

require('./SourceAndMapMixin')(OriginalSource.prototype);
