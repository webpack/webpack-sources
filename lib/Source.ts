/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */

abstract class Source {
    size() {
        return this.source().length;
    }

    map(options?) {
        return null;
    }

    sourceAndMap(options?): {
        source: string
        map: string
    } {
        return {
            source: this.source(),
            map: this.map()
        };
    }

    updateHash(hash) {
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
