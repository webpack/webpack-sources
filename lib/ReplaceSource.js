/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Source = require("./Source");
const { SourceNode } = require("source-map");
const { getSourceAndMap, getMap, streamChunks } = require("./helpers");

// since v8 7.0, Array.prototype.sort is stable
const hasStableSort =
	typeof process === "object" &&
	process.versions &&
	typeof process.versions.v8 === "string" &&
	!/^[0-6]\./.test(process.versions.v8);

// This is larger than max string length
const MAX_SOURCE_POSITION = 0x20000000;

const SPLIT_LINES_REGEX = /[^\n]+\n?|\n/g;

class Replacement {
	constructor(start, end, content, name) {
		this.start = start;
		this.end = end;
		this.content = content;
		this.name = name;
		if (!hasStableSort) {
			this.index = -1;
		}
	}
}

class ReplaceSource extends Source {
	constructor(source, name) {
		super();
		this._source = source;
		this._name = name;
		/** @type {Replacement[]} */
		this._replacements = [];
		this._isSorted = true;
	}

	getName() {
		return this._name;
	}

	getReplacements() {
		this._sortReplacements();
		return this._replacements;
	}

	replace(start, end, newValue, name) {
		if (typeof newValue !== "string")
			throw new Error(
				"insertion must be a string, but is a " + typeof newValue
			);
		this._replacements.push(new Replacement(start, end + 1, newValue, name));
		this._isSorted = false;
	}

	insert(pos, newValue, name) {
		if (typeof newValue !== "string")
			throw new Error(
				"insertion must be a string, but is a " +
					typeof newValue +
					": " +
					newValue
			);
		this._replacements.push(new Replacement(pos, pos, newValue, name));
		this._isSorted = false;
	}

	source() {
		let code = "";
		this.streamChunks(
			{ columns: false },
			chunk => (code += chunk),
			() => {},
			() => {}
		);
		return code;
	}

	map(options) {
		if (this._replacements.length === 0) {
			return this._source.map(options);
		}
		return getMap(this, options);
	}

	sourceAndMap(options) {
		if (this._replacements.length === 0) {
			return this._source.sourceAndMap(options);
		}
		return getSourceAndMap(this, options);
	}

	original() {
		return this._source;
	}

	_sortReplacements() {
		if (this._isSorted) return;
		if (hasStableSort) {
			this._replacements.sort(function (a, b) {
				const diff1 = a.start - b.start;
				if (diff1 !== 0) return diff1;
				const diff2 = b.start - a.start;
				if (diff2 !== 0) return diff2;
				return 0;
			});
		} else {
			this._replacements.forEach((repl, i) => (repl.index = i));
			this._replacements.sort(function (a, b) {
				const diff1 = a.start - b.start;
				if (diff1 !== 0) return diff1;
				const diff2 = b.start - a.start;
				if (diff2 !== 0) return diff2;
				return a.index - b.index;
			});
		}
		this._isSorted = true;
	}

	_replaceString(str) {
		if (typeof str !== "string")
			throw new Error(
				"str must be a string, but is a " + typeof str + ": " + str
			);
		this._sortReplacements();
		const result = [str];
		this._replacements.forEach(function (repl) {
			const remSource = result.pop();
			const splitted1 = this._splitString(remSource, Math.floor(repl.end + 1));
			const splitted2 = this._splitString(splitted1[0], Math.floor(repl.start));
			result.push(splitted1[1], repl.content, splitted2[0]);
		}, this);

		// write out result array in reverse order
		let resultStr = "";
		for (let i = result.length - 1; i >= 0; --i) {
			resultStr += result[i];
		}
		return resultStr;
	}

	_splitString(str, position) {
		return position <= 0
			? ["", str]
			: [str.substr(0, position), str.substr(position)];
	}

	_replaceInStringNode(
		output,
		replace,
		getOriginalSource,
		node,
		position,
		mapping
	) {
		let original = undefined;

		do {
			let splitPosition = replace.position - position;
			// If multiple replaces occur in the same location then the splitPosition may be
			// before the current position for the subsequent splits. Ensure it is >= 0
			if (splitPosition < 0) {
				splitPosition = 0;
			}
			if (splitPosition >= node.length || replace.done) {
				if (replace.emit) {
					const nodeEnd = new SourceNode(
						mapping.line,
						mapping.column,
						mapping.source,
						node,
						mapping.name
					);
					output.push(nodeEnd);
				}
				return position + node.length;
			}

			const originalColumn = mapping.column;

			// Try to figure out if generated code matches original code of this segement
			// If this is the case we assume that it's allowed to move mapping.column
			// Because getOriginalSource can be expensive we only do it when neccessary

			let nodePart;
			if (splitPosition > 0) {
				nodePart = node.slice(0, splitPosition);
				if (original === undefined) {
					original = getOriginalSource(mapping);
				}
				if (
					original &&
					original.length >= splitPosition &&
					original.startsWith(nodePart)
				) {
					mapping.column += splitPosition;
					original = original.substr(splitPosition);
				}
			}

			const emit = replace.next();
			if (!emit) {
				// Stop emitting when we have found the beginning of the string to replace.
				// Emit the part of the string before splitPosition
				if (splitPosition > 0) {
					const nodeStart = new SourceNode(
						mapping.line,
						originalColumn,
						mapping.source,
						nodePart,
						mapping.name
					);
					output.push(nodeStart);
				}

				// Emit the replacement value
				if (replace.value) {
					output.push(
						new SourceNode(
							mapping.line,
							mapping.column,
							mapping.source,
							replace.value,
							mapping.name || replace.name
						)
					);
				}
			}

			// Recurse with remainder of the string as there may be multiple replaces within a single node
			node = node.substr(splitPosition);
			position += splitPosition;
			// eslint-disable-next-line no-constant-condition
		} while (true);
	}

	streamChunks(options, onChunk, onSource, onName) {
		this._sortReplacements();
		const repls = this._replacements;
		let pos = 0;
		let i = 0;
		let replacmentEnd = -1;
		let nextReplacement =
			i < repls.length ? repls[i].start : MAX_SOURCE_POSITION;
		let generatedLineOffset = 0;
		let generatedColumnOffset = 0;
		let generatedColumnOffsetLine = 0;
		const sourceContents = [];
		const nameMapping = new Map();
		const nameIndexMapping = [];
		const checkOriginalContent = (sourceIndex, line, column, expectedChunk) => {
			let content =
				sourceIndex < sourceContents.length
					? sourceContents[sourceIndex]
					: undefined;
			if (content === undefined) return false;
			if (typeof content === "string") {
				content = content.match(SPLIT_LINES_REGEX) || [];
				sourceContents[sourceIndex] = content;
			}
			const contentLine = line <= content.length ? content[line - 1] : null;
			if (contentLine === null) return false;
			return (
				contentLine.slice(column, column + expectedChunk.length) ===
				expectedChunk
			);
		};
		let { generatedLine, generatedColumn } = streamChunks(
			this._source,
			options,
			(
				chunk,
				generatedLine,
				generatedColumn,
				sourceIndex,
				originalLine,
				originalColumn,
				nameIndex
			) => {
				let chunkPos = 0;
				let endPos = pos + chunk.length;

				// Skip over when it has been replaced
				if (replacmentEnd > pos) {
					// Skip over the whole chunk
					if (replacmentEnd >= endPos) {
						const line = generatedLine + generatedLineOffset;
						if (chunk.endsWith("\n")) {
							generatedLineOffset--;
						} else if (generatedColumnOffsetLine === line) {
							generatedColumnOffset -= chunk.length;
						} else {
							generatedColumnOffset = chunk.length;
							generatedColumnOffsetLine = line;
						}
						pos = endPos;
						return;
					}

					// Partially skip over chunk
					chunkPos = replacmentEnd - pos;
					if (
						checkOriginalContent(
							sourceIndex,
							originalLine,
							originalColumn,
							chunk.slice(0, chunkPos)
						)
					) {
						originalColumn += chunkPos;
					}
					pos += chunkPos;
					const line = generatedLine + generatedLineOffset;
					if (generatedColumnOffsetLine === line) {
						generatedColumnOffset -= chunkPos;
					} else {
						generatedColumnOffset = chunkPos;
						generatedColumnOffsetLine = line;
					}
					generatedColumn += chunkPos;
				}

				// Is a replacement in the chunk?
				if (nextReplacement < endPos) {
					do {
						let line = generatedLine + generatedLineOffset;
						if (nextReplacement > pos) {
							// Emit chunk until replacement
							const offset = nextReplacement - pos;
							const chunkSlice = chunk.slice(chunkPos, chunkPos + offset);
							onChunk(
								chunkSlice,
								line,
								generatedColumn +
									(line === generatedColumnOffsetLine
										? generatedColumnOffset
										: 0),
								sourceIndex,
								originalLine,
								originalColumn,
								nameIndex < 0 ? -1 : nameIndexMapping[nameIndex]
							);
							generatedColumn += offset;
							chunkPos += offset;
							pos = nextReplacement;
							if (
								checkOriginalContent(
									sourceIndex,
									originalLine,
									originalColumn,
									chunkSlice
								)
							) {
								originalColumn += chunkSlice.length;
							}
						}

						// Insert replacement content splitted into chunks by lines
						const regexp = /[^\n]+\n?|\n/g;
						const { content, name } = repls[i];
						let match = regexp.exec(content);
						let replacementNameIndex = nameIndex;
						if (name) {
							let globalIndex = nameMapping.get(name);
							if (globalIndex === undefined) {
								globalIndex = nameMapping.size;
								nameMapping.set(name, globalIndex);
								onName(globalIndex, name);
							}
							replacementNameIndex = globalIndex;
						}
						while (match !== null) {
							const contentLine = match[0];
							onChunk(
								contentLine,
								line,
								generatedColumn +
									(line === generatedColumnOffsetLine
										? generatedColumnOffset
										: 0),
								sourceIndex,
								originalLine,
								originalColumn,
								replacementNameIndex
							);

							// Only the first chunk has name assigned
							replacementNameIndex = -1;

							match = regexp.exec(content);
							if (match === null && !contentLine.endsWith("\n")) {
								if (generatedColumnOffsetLine === line) {
									generatedColumnOffset += contentLine.length;
								} else {
									generatedColumnOffset = contentLine.length;
									generatedColumnOffsetLine = line;
								}
							} else {
								generatedLineOffset++;
								line++;
								generatedColumn = 0;
							}
						}

						// Remove replaced content by settings this variable
						replacmentEnd = Math.max(replacmentEnd, repls[i].end);

						// Move to next replacment
						i++;
						nextReplacement =
							i < repls.length ? repls[i].start : MAX_SOURCE_POSITION;

						// Skip over when it has been replaced
						const offset = chunk.length - endPos + replacmentEnd - chunkPos;
						if (offset > 0) {
							// Skip over whole chunk
							if (replacmentEnd >= endPos) {
								let line = generatedLine + generatedLineOffset;
								if (chunk.endsWith("\n")) {
									generatedLineOffset--;
									if (generatedColumnOffsetLine === line) {
										generatedColumnOffset += generatedColumn;
									} else {
										generatedColumnOffset = generatedColumn;
										generatedColumnOffsetLine = line;
									}
								} else if (generatedColumnOffsetLine === line) {
									generatedColumnOffset -= chunk.length - chunkPos;
								} else {
									generatedColumnOffset = chunk.length - chunkPos;
									generatedColumnOffsetLine = line;
								}
								pos = endPos;
								return;
							}

							// Partially skip over chunk
							const line = generatedLine + generatedLineOffset;
							if (
								checkOriginalContent(
									sourceIndex,
									originalLine,
									originalColumn,
									chunk.slice(chunkPos, chunkPos + offset)
								)
							) {
								originalColumn += offset;
							}
							chunkPos += offset;
							pos += offset;
							if (generatedColumnOffsetLine === line) {
								generatedColumnOffset -= offset;
							} else {
								generatedColumnOffset = offset;
								generatedColumnOffsetLine = line;
							}
							generatedColumn += offset;
						}
					} while (nextReplacement < endPos);
				}

				// Emit remaining chunk
				if (chunkPos < chunk.length) {
					const chunkSlice = chunkPos === 0 ? chunk : chunk.slice(chunkPos);
					const line = generatedLine + generatedLineOffset;
					onChunk(
						chunkSlice,
						line,
						generatedColumn +
							(line === generatedColumnOffsetLine ? generatedColumnOffset : 0),
						sourceIndex,
						originalLine,
						originalColumn,
						nameIndex < 0 ? -1 : nameIndexMapping[nameIndex]
					);
				}
				pos = endPos;
			},
			(sourceIndex, source, sourceContent) => {
				while (sourceContents.length < sourceIndex)
					sourceContents.push(undefined);
				sourceContents[sourceIndex] = sourceContent;
				onSource(sourceIndex, source, sourceContent);
			},
			(nameIndex, name) => {
				let globalIndex = nameMapping.get(name);
				if (globalIndex === undefined) {
					globalIndex = nameMapping.size;
					nameMapping.set(name, globalIndex);
					onName(globalIndex, name);
				}
				nameIndexMapping[nameIndex] = globalIndex;
			}
		);

		// Handle remaining replacements
		let remainer = "";
		for (; i < repls.length; i++) {
			remainer += repls[i].content;
		}

		// Insert remaining replacements content splitted into chunks by lines
		let line = generatedLine + generatedLineOffset;
		const regexp = /[^\n]+\n?|\n/g;
		let match = regexp.exec(remainer);
		while (match !== null) {
			const contentLine = match[0];
			onChunk(
				contentLine,
				line,
				generatedColumn +
					(line === generatedColumnOffsetLine ? generatedColumnOffset : 0),
				-1,
				-1,
				-1,
				-1
			);

			match = regexp.exec(remainer);
			if (match === null && !contentLine.endsWith("\n")) {
				if (generatedColumnOffsetLine === line) {
					generatedColumnOffset += contentLine.length;
				} else {
					generatedColumnOffset = contentLine.length;
					generatedColumnOffsetLine = line;
				}
			} else {
				generatedLineOffset++;
				line++;
				generatedColumn = 0;
			}
		}

		return {
			generatedLine: line,
			generatedColumn:
				generatedColumn +
				(line === generatedColumnOffsetLine ? generatedColumnOffset : 0)
		};
	}

	updateHash(hash) {
		this._sortReplacements();
		hash.update("ReplaceSource");
		this._source.updateHash(hash);
		hash.update(this._name || "");
		for (const repl of this._replacements) {
			hash.update(`${repl.start}`);
			hash.update(`${repl.end}`);
			hash.update(`${repl.content}`);
			hash.update(`${repl.insertIndex}`);
			hash.update(`${repl.name}`);
		}
	}
}

module.exports = ReplaceSource;
