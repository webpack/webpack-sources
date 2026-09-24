declare namespace _exports {
	export { RawSourceMap, GeneratedSourceInfo, OnChunk, OnName, OnSource };
}
declare function _exports(
	source: string,
	sourceMap: RawSourceMap,
	onChunk: OnChunk,
	onSource: OnSource,
	onName: OnName,
	finalSource: boolean,
	columns: boolean,
): GeneratedSourceInfo;
export = _exports;
type RawSourceMap = import("../Source").RawSourceMap;
type GeneratedSourceInfo =
	import("./getGeneratedSourceInfo").GeneratedSourceInfo;
type OnChunk = import("./streamChunks").OnChunk;
type OnName = import("./streamChunks").OnName;
type OnSource = import("./streamChunks").OnSource;
