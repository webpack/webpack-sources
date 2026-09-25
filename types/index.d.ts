declare namespace _exports {
	export {
		CachedData,
		SourceLike,
		ConcatSourceChild,
		Replacement,
		HashLike,
		MapOptions,
		RawSourceMap,
		SourceAndMap,
		SourceValue,
		GeneratedSourceInfo,
		OnChunk,
		OnName,
		OnSource,
		StreamChunksOptions,
	};
}
declare namespace _exports {
	const Source: typeof import("./Source");
	const RawSource: typeof import("./RawSource");
	const OriginalSource: typeof import("./OriginalSource");
	const SourceMapSource: typeof import("./SourceMapSource");
	const CachedSource: typeof import("./CachedSource");
	const ConcatSource: typeof import("./ConcatSource");
	const ReplaceSource: typeof import("./ReplaceSource");
	const PrefixSource: typeof import("./PrefixSource");
	const SizeOnlySource: typeof import("./SizeOnlySource");
	const CompatSource: typeof import("./CompatSource");
	namespace util {
		const stringBufferUtils: typeof import("./helpers/stringBufferUtils");
	}
}
export = _exports;
type CachedData = import("./CachedSource").CachedData;
type SourceLike = import("./CompatSource").SourceLike;
type ConcatSourceChild = import("./ConcatSource").Child;
type Replacement = import("./ReplaceSource").Replacement;
type HashLike = import("./Source").HashLike;
type MapOptions = import("./Source").MapOptions;
type RawSourceMap = import("./Source").RawSourceMap;
type SourceAndMap = import("./Source").SourceAndMap;
type SourceValue = import("./Source").SourceValue;
type GeneratedSourceInfo =
	import("./helpers/getGeneratedSourceInfo").GeneratedSourceInfo;
type OnChunk = import("./helpers/streamChunks").OnChunk;
type OnName = import("./helpers/streamChunks").OnName;
type OnSource = import("./helpers/streamChunks").OnSource;
type StreamChunksOptions = import("./helpers/streamChunks").Options;
