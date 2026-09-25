export function getMap(
	source: SourceLikeWithStreamChunks,
	options?: Options | undefined,
): RawSourceMap | null;
export function getSourceAndMap(
	inputSource: SourceLikeWithStreamChunks,
	options?: Options | undefined,
): SourceAndMap;
export type RawSourceMap = import("../Source").RawSourceMap;
export type SourceAndMap = import("../Source").SourceAndMap;
export type Options = import("./streamChunks").Options;
export type StreamChunksFunction =
	import("./streamChunks").StreamChunksFunction;
export type SourceLikeWithStreamChunks = {
	streamChunks: StreamChunksFunction;
};
