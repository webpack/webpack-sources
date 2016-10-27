/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Source = require('./Source');

import { SourceNode } from 'source-map'

class PrefixSource extends Source {
    _source: Source | string
    _prefix: string

    constructor(prefix, source) {
        super();
        this._source = source;
        this._prefix = prefix;
    }

    source() {
        const node: string = typeof this._source === 'string' ? this._source : this._source.source();
        const prefix = this._prefix;
        return prefix + node.replace(/\n(.)/g, '\n' + prefix + '$1');
    }

    node(options) {
        const node = this._source.node(options);
        const append = [this._prefix];
        return new SourceNode(null, null, null, [cloneAndPrefix(node, this._prefix, append)]);
    }

    listMap(options) {
        const prefix = this._prefix;
        const map = this._source.listMap(options);
        map.mapGeneratedCode(code => prefix + code.replace(/\n(.)/g, '\n' + prefix + '$1'));
        return map;
    }

    updateHash(hash) {
        if (typeof this._source === 'string') {
            hash.update(this._source);
        }
        else {
            this._source.updateHash(hash);
        }
        if (typeof this._prefix === 'string') {
            hash.update(this._prefix);
        }
        else {
            this._prefix.updateHash(hash);
        }
    }
}

export = PrefixSource;

require('./SourceAndMapMixin')(PrefixSource.prototype);

function cloneAndPrefix(node, prefix, append) {
    if (typeof node === 'string') {
        let result = node.replace(/\n(.)/g, `\n${prefix}$1`);
        if (append.length > 0) {
            result = append.pop() + result;
        }
        if (/\n$/.test(node)) {
            append.push(prefix);
        }
        return result;
    }
    else {
        const newNode = new SourceNode(node.line, node.column, node.source, node.children.map(
            node => cloneAndPrefix(node, prefix, append)), node.name);
        newNode.sourceContents = node.sourceContents;
        return newNode;
    }
}
