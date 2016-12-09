/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { RawSourceMap } from 'source-map'
import { Hash } from 'crypto'

abstract class Source {
    size() {
        return this.source().length;
    }

    map(options?): RawSourceMap {
        return null;
    }

    sourceAndMap(options?): {
        source: string
        map: RawSourceMap
    } {
        return {
            source: this.source(),
            map: this.map()
        };
    }

    updateHash(hash: Hash) {
        const source = this.source();
        hash.update(source || '');
    }

    source(options?): string {
        return null
    }

    node(options?) {
        return null
    }

    listNode(options?) {
        return null
    }

    listMap(options?) {
        return null
    }
}

export = Source;
