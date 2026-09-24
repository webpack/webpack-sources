export = streamChunksOfCombinedSourceMap;
/** @typedef {import("../Source").RawSourceMap} RawSourceMap */
/** @typedef {import("./getGeneratedSourceInfo").GeneratedSourceInfo} GeneratedSourceInfo */
/** @typedef {import("./streamChunks").OnChunk} onChunk */
/** @typedef {import("./streamChunks").OnName} OnName */
/** @typedef {import("./streamChunks").OnSource} OnSource */
/**
 * @param {string} source source
 * @param {RawSourceMap} sourceMap source map
 * @param {string} innerSourceName inner source name
 * @param {string} innerSource inner source
 * @param {RawSourceMap} innerSourceMap inner source map
 * @param {boolean | undefined} removeInnerSource do remove inner source
 * @param {onChunk} onChunk on chunk
 * @param {OnSource} onSource on source
 * @param {OnName} onName on name
 * @param {boolean} finalSource finalSource
 * @param {boolean} columns columns
 * @returns {GeneratedSourceInfo} generated source info
 */
declare function streamChunksOfCombinedSourceMap(
	source: string,
	sourceMap: RawSourceMap,
	innerSourceName: string,
	innerSource: string,
	innerSourceMap: RawSourceMap,
	removeInnerSource: boolean | undefined,
	onChunk: onChunk,
	onSource: OnSource,
	onName: OnName,
	finalSource: boolean,
	columns: boolean,
): GeneratedSourceInfo;
declare namespace streamChunksOfCombinedSourceMap {
	export { RawSourceMap, GeneratedSourceInfo, onChunk, OnName, OnSource };
}
type RawSourceMap = import("../Source").RawSourceMap;
type GeneratedSourceInfo =
	import("./getGeneratedSourceInfo").GeneratedSourceInfo;
type onChunk = import("./streamChunks").OnChunk;
type OnName = import("./streamChunks").OnName;
type OnSource = import("./streamChunks").OnSource;
