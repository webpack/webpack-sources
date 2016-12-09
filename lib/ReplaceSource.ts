/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Source = require('./Source');

import { SourceNode, SourceMapConsumer } from 'source-map'

class ReplaceSource extends Source {
    _source: Source
    _name: string
    replacements: any[][]

    constructor(source: Source, name: string) {
        super();
        this._source = source;
        this._name = name;
        this.replacements = [];
    }

    replace(start: number, end: number, newValue: string) {
        if (typeof newValue !== 'string') {
            throw new Error(`insertion must be a string, but is a ${typeof newValue}`);
        }
        this.replacements.push([start, end, newValue, this.replacements.length]);
    }

    insert(pos: number, newValue: string) {
        if (typeof newValue !== 'string') {
            throw new Error(`insertion must be a string, but is a ${typeof newValue}: ${newValue}`);
        }
        this.replacements.push([pos, pos - 1, newValue, this.replacements.length]);
    }

    source() {
        return this._replaceString(this._source.source());
    }

    _sortReplacements() {
        this.replacements.sort((a, b) => {
            const diff = b[1] - a[1];
            if (diff !== 0) {
                return diff;
            }
            return b[3] - a[3];
        });
    }

    _replaceString(str: string) {
        if (typeof str !== 'string') {
            throw new Error(`str must be a string, but is a ${typeof str}: ${str}`);
        }
        this._sortReplacements();
        let result = [str];
        this.replacements.forEach(function (repl) {
            const remSource = result.pop();
            const splitted1 = this._splitString(remSource, Math.floor(repl[1] + 1));
            const splitted2 = this._splitString(splitted1[0], Math.floor(repl[0]));
            result.push(splitted1[1], repl[2], splitted2[0]);
        }, this);
        result = result.reverse();
        return result.join('');
    }

    node(options) {
        this._sortReplacements();
        let result = [this._source.node(options)];
        this.replacements.forEach(function (repl) {
            const remSource = result.pop();
            const splitted1 = this._splitSourceNode(remSource, Math.floor(repl[1] + 1));
            let splitted2;
            if (Array.isArray(splitted1)) {
                splitted2 = this._splitSourceNode(splitted1[0], Math.floor(repl[0]));
                if (Array.isArray(splitted2)) {
                    result.push(splitted1[1], this._replacementToSourceNode(splitted2[1], repl[2]), splitted2[0]);
                }
                else {
                    result.push(splitted1[1], this._replacementToSourceNode(splitted1[1], repl[2]), splitted1[0]);
                }
            }
            else {
                splitted2 = this._splitSourceNode(remSource, Math.floor(repl[0]));
                if (Array.isArray(splitted2)) {
                    result.push(this._replacementToSourceNode(splitted2[1], repl[2]), splitted2[0]);
                }
                else {
                    result.push(repl[2], remSource);
                }
            }
        }, this);
        result = result.reverse();
        return new SourceNode(null, null, null, result);
    }

    listMap(options) {
        const map = this._source.listMap(options);
        if (map.children.length !== 1) {
            let code = map.toString();
            code = this._replaceString(code).split('\n');
            let currentIndex = 0;
            map.mapGeneratedCode(str => {
                let idx = -1;
                let count = -1;
                do {
                    count++;
                    idx = str.indexOf('\n', idx + 1);
                } while (idx >= 0);
                if (!count) {
                    return '';
                }
                const result = `${code.slice(currentIndex, currentIndex + count).join('\n')}\n`;
                currentIndex += count;
                return result;
            });
            map.add(code.slice(currentIndex).join('\n'));
        }
        else {
            map.mapGeneratedCode(this._replaceString.bind(this));
        }
        return map;
    }

    _replacementToSourceNode(oldNode: SourceNode, newString: string): string | SourceNode {
        const map = oldNode.toStringWithSourceMap({
            file: '?'
        }).map;
        const original = new SourceMapConsumer(map.toJSON()).originalPositionFor({
            line: 1,
            column: 0
        });
        if (original) {
            return new SourceNode(original.line, original.column, original.source, newString);
        }
        else {
            return newString;
        }
    }

    _splitSourceNode(node: SourceNode, position: SourceNode[]): SourceNode[]
    _splitSourceNode(node: string, position: number): number

    _splitSourceNode(node: any, position: any): any {
        if (typeof node === 'string' && typeof position === 'number') {
            if (node.length <= position) {
                return position - node.length;
            }
            return position <= 0 ? ['', node] : [node.substr(0, position), node.substr(position)];
        }
        else {
            for (let i = 0; i < node.children.length; i++) {
                position = this._splitSourceNode(node.children[i], position);
                if (Array.isArray(position)) {
                    const leftNode = new SourceNode(node.line, node.column, node.source, node.children.slice(0, i)
                        .concat([position[0]]), node.name);
                    const rightNode = new SourceNode(node.line, node.column, node.source, [position[1]].concat(node.children.slice(i + 1)), node.name);
                    leftNode.sourceContents = node.sourceContents;
                    return [leftNode, rightNode];
                }
            }
            return position;
        }
    }

    _splitString(str: string, position: number) {
        return position <= 0 ? ['', str] : [str.substr(0, position), str.substr(position)];
    }
}

export = ReplaceSource;

require('./SourceAndMapMixin')(ReplaceSource.prototype);
