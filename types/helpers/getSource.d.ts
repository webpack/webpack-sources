export = getSource;
/** @typedef {import("../Source").RawSourceMap} RawSourceMap */
/**
 * @param {RawSourceMap} sourceMap source map
 * @param {number} index index
 * @returns {string | null} name
 */
declare function getSource(
	sourceMap: RawSourceMap,
	index: number,
): string | null;
declare namespace getSource {
	export { RawSourceMap };
}
type RawSourceMap = import("../Source").RawSourceMap;
