declare namespace _exports {
	export { GeneratedSourceInfo, OnChunk, OnName, OnSource };
}
declare function _exports(
	source: string,
	onChunk: OnChunk,
	onSource: OnSource,
	onName: OnName,
	finalSource: boolean,
): GeneratedSourceInfo;
export = _exports;
type GeneratedSourceInfo =
	import("./getGeneratedSourceInfo").GeneratedSourceInfo;
type OnChunk = import("./streamChunks").OnChunk;
type OnName = import("./streamChunks").OnName;
type OnSource = import("./streamChunks").OnSource;
