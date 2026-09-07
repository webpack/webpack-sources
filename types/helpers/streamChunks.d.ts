declare namespace _exports {
	export {
		Source,
		GeneratedSourceInfo,
		OnChunk,
		ScopeBindings,
		OnSource,
		OnName,
		Options,
		StreamChunksFunction,
		SourceMaybeWithStreamChunksFunction,
	};
}
declare function _exports(
	source: SourceMaybeWithStreamChunksFunction,
	options: Options,
	onChunk: OnChunk,
	onSource: OnSource,
	onName: OnName,
): GeneratedSourceInfo;
export = _exports;
type Source = import("../Source");
type GeneratedSourceInfo =
	import("./getGeneratedSourceInfo").GeneratedSourceInfo;
type OnChunk = (
	chunk: string | undefined,
	generatedLine: number,
	generatedColumn: number,
	sourceIndex: number,
	originalLine: number,
	originalColumn: number,
	nameIndex: number,
) => void;
type ScopeBindings = Map<string, string>;
type OnSource = (
	sourceIndex: number,
	source: string | null,
	sourceContent: string | undefined,
	scopeBindings?: ScopeBindings,
) => void;
type OnName = (nameIndex: number, name: string) => void;
type Options = {
	source?: boolean;
	finalSource?: boolean;
	columns?: boolean;
	scopes?: boolean;
};
type StreamChunksFunction = (
	options: Options,
	onChunk: OnChunk,
	onSource: OnSource,
	onName: OnName,
) => any;
type SourceMaybeWithStreamChunksFunction = Source & {
	streamChunks?: StreamChunksFunction;
};
