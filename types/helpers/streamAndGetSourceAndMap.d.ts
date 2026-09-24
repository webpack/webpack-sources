export = streamAndGetSourceAndMap;
/** @typedef {import("../Source").RawSourceMap} RawSourceMap */
/** @typedef {import("./streamChunks").GeneratedSourceInfo} GeneratedSourceInfo */
/** @typedef {import("./streamChunks").OnChunk} OnChunk */
/** @typedef {import("./streamChunks").OnName} OnName */
/** @typedef {import("./streamChunks").OnSource} OnSource */
/** @typedef {import("./streamChunks").Options} Options */
/** @typedef {import("./streamChunks").SourceMaybeWithStreamChunksFunction} SourceMaybeWithStreamChunksFunction */
/**
 * @param {SourceMaybeWithStreamChunksFunction} inputSource input source
 * @param {Options} options options
 * @param {OnChunk} onChunk on chunk
 * @param {OnSource} onSource on source
 * @param {OnName} onName on name
 * @returns {{ result: GeneratedSourceInfo, source: string, map: RawSourceMap | null }} result
 */
declare function streamAndGetSourceAndMap(
	inputSource: SourceMaybeWithStreamChunksFunction,
	options: Options,
	onChunk: OnChunk,
	onSource: OnSource,
	onName: OnName,
): {
	result: GeneratedSourceInfo;
	source: string;
	map: RawSourceMap | null;
};
declare namespace streamAndGetSourceAndMap {
	export {
		RawSourceMap,
		GeneratedSourceInfo,
		OnChunk,
		OnName,
		OnSource,
		Options,
		SourceMaybeWithStreamChunksFunction,
	};
}
type RawSourceMap = import("../Source").RawSourceMap;
type GeneratedSourceInfo = import("./streamChunks").GeneratedSourceInfo;
type OnChunk = import("./streamChunks").OnChunk;
type OnName = import("./streamChunks").OnName;
type OnSource = import("./streamChunks").OnSource;
type Options = import("./streamChunks").Options;
type SourceMaybeWithStreamChunksFunction =
	import("./streamChunks").SourceMaybeWithStreamChunksFunction;
