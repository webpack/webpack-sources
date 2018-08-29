/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

var Source = require("./Source");
var SourceNode = require("source-map").SourceNode;
var SourceListMap = require("source-list-map").SourceListMap;
var fromStringWithSourceMap = require("source-list-map").fromStringWithSourceMap;
var SourceMapConsumer = require("source-map").SourceMapConsumer;

class ReplaceSource extends Source {
	constructor(source, name) {
		super();
		this._source = source;
		this._name = name;
		this.replacements = [];
	}

	replace(start, end, newValue) {
		if(typeof newValue !== "string")
			throw new Error("insertion must be a string, but is a " + typeof newValue);
		this.replacements.push([start, end, newValue, this.replacements.length]);
	}

	insert(pos, newValue) {
		if(typeof newValue !== "string")
			throw new Error("insertion must be a string, but is a " + typeof newValue + ": " + newValue);
		this.replacements.push([pos, pos - 1, newValue, this.replacements.length]);
	}

	source(options) {
		return this._replaceString(this._source.source());
	}

	original() {
		return this._source;
	}

	_sortReplacements() {
		this.replacements.sort(function(a, b) {
			var diff = b[1] - a[1];
			if(diff !== 0)
				return diff;
			diff = b[0] - a[0];
			if(diff !== 0)
				return diff;
			return b[3] - a[3];
		});
	}

	_replaceString(str) {
		if(typeof str !== "string")
			throw new Error("str must be a string, but is a " + typeof str + ": " + str);
		this._sortReplacements();
		var result = [str];
		this.replacements.forEach(function(repl) {
			var remSource = result.pop();
			var splitted1 = this._splitString(remSource, Math.floor(repl[1] + 1));
			var splitted2 = this._splitString(splitted1[0], Math.floor(repl[0]));
			result.push(splitted1[1], repl[2], splitted2[0]);
		}, this);

		// write out result array in reverse order
		let resultStr = "";
		for(let i = result.length - 1; i >= 0; --i) {
			resultStr += result[i];
		}
		return resultStr;
	}

	node(options) {
		var node = this._source.node(options);
		if(this.replacements.length === 0) {
			return node;
		}
		this.replacements.sort(sortReplacementsAscending);
		var replace = new ReplacementEnumerator(this.replacements);
		var output = [];
		var position = 0;

		// We build a new list of SourceNodes in "output"
		// from the original mapping data

		var replaceInStringNode = this._replaceInStringNode.bind(this, output, replace);
		node.walk(function(chunk, mapping) {
			position = replaceInStringNode(chunk, position, mapping);
		});

		// If any replacements occur after the end of the original file, then we append them
		// directly to the end of the output
		var remaining = replace.footer();
		if(remaining) {
			output.push(remaining);
		}

		var result = new SourceNode(null, null, null, output);

		// We need to add source contents afterwards
		node.walkSourceContents(function(sourceFile, sourceContent) {
			result.setSourceContent(sourceFile, sourceContent);
		});

		return result;
	}

	listMap(options) {
		this._sortReplacements();
		var map = this._source.listMap(options);
		var currentIndex = 0;
		var replacements = this.replacements;
		var idxReplacement = replacements.length - 1;
		var removeChars = 0;
		map = map.mapGeneratedCode(function(str) {
			var newCurrentIndex = currentIndex + str.length;
			if(removeChars > str.length) {
				removeChars -= str.length;
				str = "";
			} else {
				if(removeChars > 0) {
					str = str.substr(removeChars);
					currentIndex += removeChars;
					removeChars = 0;
				}
				var finalStr = "";
				while(idxReplacement >= 0 && replacements[idxReplacement][0] < newCurrentIndex) {
					var repl = replacements[idxReplacement];
					var start = Math.floor(repl[0]);
					var end = Math.floor(repl[1] + 1);
					var before = str.substr(0, Math.max(0, start - currentIndex));
					if(end <= newCurrentIndex) {
						var after = str.substr(Math.max(0, end - currentIndex));
						finalStr += before + repl[2];
						str = after;
						currentIndex = Math.max(currentIndex, end);
					} else {
						finalStr += before + repl[2];
						str = "";
						removeChars = end - newCurrentIndex;
					}
					idxReplacement--;
				}
				str = finalStr + str;
			}
			currentIndex = newCurrentIndex;
			return str;
		});
		var extraCode = "";
		while(idxReplacement >= 0) {
			extraCode += replacements[idxReplacement][2];
			idxReplacement--;
		}
		if(extraCode) {
			map.add(extraCode);
		}
		return map;
	}

	_splitString(str, position) {
		return position <= 0 ? ["", str] : [str.substr(0, position), str.substr(position)];
	}

	_replaceInStringNode(output, replace, node, position, parent) {
		do {
			var splitPosition = replace.position - position;
			// If multiple replaces occur in the same location then the splitPosition may be
			// before the current position for the subsequent splits. Ensure it is >= 0
			if(splitPosition < 0) {
				splitPosition = 0;
			}
			if(splitPosition >= node.length || replace.done) {
				if(replace.emit) {
					var nodeEnd = new SourceNode(
						parent.line,
						parent.column,
						parent.source,
						node,
						parent.name
					);
					output.push(nodeEnd);
				}
				return position + node.length;
			}
			var emit = replace.next();
			if(!emit) {
				// Stop emitting when we have found the beginning of the string to replace.
				// Emit the part of the string before splitPosition
				if(splitPosition > 0) {
					var nodeStart = new SourceNode(
						parent.line,
						parent.column,
						parent.source,
						node.substr(0, splitPosition),
						parent.name
					);
					output.push(nodeStart);
				}

				// Emit the replacement value
				if(replace.value) {
					output.push(new SourceNode(
						parent.line,
						parent.column,
						parent.source,
						replace.value
					));
				}
			}

			// Recurse with remainder of the string as there may be multiple replaces within a single node
			node = node.substr(splitPosition);
			position += splitPosition;
		} while (true);
	}
}

function sortReplacementsAscending(a, b) {
	var diff = a[1] - b[1]; // end
	if(diff !== 0)
		return diff;
	diff = a[0] - b[0]; // start
	if(diff !== 0)
		return diff;
	return a[3] - b[3]; // insert order
}

class ReplacementEnumerator {
	constructor(replacements) {
		this.emit = true;
		this.done = !replacements || replacements.length === 0;
		this.index = 0;
		this.replacements = replacements;
		if(!this.done) {
			// Set initial start position in case .header is not called
			var repl = replacements[0];
			this.position = Math.floor(repl[0]);
			if(this.position < 0)
				this.position = 0;
		}
	}

	next() {
		if(this.done)
			return true;
		if(this.emit) {
			// Start point found. stop emitting. set position to find end
			var repl = this.replacements[this.index];
			var end = Math.floor(repl[1] + 1);
			this.position = end;
			this.value = repl[2];
		} else {
			// End point found. start emitting. set position to find next start
			this.index++;
			if(this.index >= this.replacements.length) {
				this.done = true;
			} else {
				var nextRepl = this.replacements[this.index];
				var start = Math.floor(nextRepl[0]);
				this.position = start;
			}
		}
		if(this.position < 0)
			this.position = 0;
		this.emit = !this.emit;
		return this.emit;
	}

	footer() {
		if(!this.done && !this.emit)
			this.next(); // If we finished _replaceInNode mid emit we advance to next entry
		return this.done ? [] : this.replacements.slice(this.index).map(function(repl) {
			return repl[2];
		}).join("");
	}
}

require("./SourceAndMapMixin")(ReplaceSource.prototype);

module.exports = ReplaceSource;
