export = getName;
/** @typedef {import("../Source").RawSourceMap} RawSourceMap */
/**
 * @param {RawSourceMap} sourceMap source map
 * @param {number} index index
 * @returns {string | undefined | null} name
 */
declare function getName(
	sourceMap: RawSourceMap,
	index: number,
): string | undefined | null;
declare namespace getName {
	export { RawSourceMap };
}
type RawSourceMap = import("../Source").RawSourceMap;
