/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

/** @typedef {[sourceIndex: number, scopeIndex: number]} DefinitionReference */

/** @typedef {[sourceIndex: number, line: number, column: number]} Callsite */

// Bindings = [exprIndex: number, ...[line: number, column: number, nameIndex: number]]
/** @typedef {[number[]]} Bindings */

/** @typedef {function(number, number, number, number, number, number[]): void} OnOriginalScope */

/** @typedef {function(number, number, number, DefinitionReference | undefined, Callsite | undefined, Bindings | undefined): void} OnGeneratedRange */

class Source {
	source() {
		throw new Error("Abstract");
	}

	buffer() {
		const source = this.source();
		if (Buffer.isBuffer(source)) return source;
		return Buffer.from(source, "utf-8");
	}

	size() {
		return this.buffer().length;
	}

	map(options) {
		return null;
	}

	sourceAndMap(options) {
		return {
			source: this.source(),
			map: this.map(options)
		};
	}

	updateHash(hash) {
		throw new Error("Abstract");
	}
}

module.exports = Source;
