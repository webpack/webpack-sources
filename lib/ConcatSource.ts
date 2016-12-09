/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { SourceNode } from 'source-map'
import { SourceListMap } from 'source-list-map'
import { Hash } from 'crypto'
import Source = require('./Source');

class ConcatSource extends Source {
    children: (string | Source)[]

    constructor(...args: (string | Source)[]) {
        super();
        this.children = args;
    }

    add(item: string | Source) {
        this.children.push(item);
    }

    source() {
        return this.children.map(item => typeof item === 'string' ? item : item.source()).join('');
    }

    size() {
        return this.children.map(item => typeof item === 'string' ? item.length : item.size())
            .reduce((sum, s) => sum + s, 0);
    }

    node(options) {
        const node = new SourceNode(null, null, null,
            this.children.map(
                item => typeof item === 'string' ? item : item.node(options)
            )
        );
        return node;
    }

    listMap(options) {
        const map = new SourceListMap();
        this.children.forEach(item => {
            if (typeof item === 'string') {
                map.add(item);
            }
            else {
                map.add(item.listMap(options));
            }
        });
        return map;
    }

    updateHash(hash: Hash) {
        this.children.forEach((item: Source) => {
            if (typeof item === 'string') {
                hash.update(item);
            }
            else {
                item.updateHash(hash);
            }
        });
    }
}

export = ConcatSource;

require('./SourceAndMapMixin')(ConcatSource.prototype);
