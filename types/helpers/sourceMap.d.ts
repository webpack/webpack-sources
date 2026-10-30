export type RawSourceMap = import("../Source").RawSourceMap;
/**
 * Where a generated position came from: `line` counts from one, `column`
 * from zero, as in a stack trace.
 */
export type OriginalPosition = {
	/**
	 * source, joined with the map's `sourceRoot`
	 */
	source: string;
	/**
	 * line
	 */
	line: number;
	/**
	 * column
	 */
	column: number;
	/**
	 * name, if the mapping carries one
	 */
	name: string | null;
};
/** @typedef {import("../Source").RawSourceMap} RawSourceMap */
/**
 * Where a generated position came from: `line` counts from one, `column`
 * from zero, as in a stack trace.
 * @typedef {object} OriginalPosition
 * @property {string} source source, joined with the map's `sourceRoot`
 * @property {number} line line
 * @property {number} column column
 * @property {string | null} name name, if the mapping carries one
 */
/**
 * Finds the original position of a generated one: the closest mapping at or
 * before `column` on `line`. Decodes the whole map, so it suits a one-off
 * lookup (an error location), not a loop over many positions.
 * @param {RawSourceMap | string | Buffer} sourceMap source map, or its JSON
 * @param {number} line generated line, counting from one
 * @param {number} column generated column, counting from zero
 * @returns {OriginalPosition | null} original position, or `null` when nothing maps there
 */
export function originalPositionFor(
	sourceMap: RawSourceMap | string | Buffer,
	line: number,
	column: number,
): OriginalPosition | null;
