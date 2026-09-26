export = CachedSource;
/**
 * @typedef {object} CachedData
 * @property {boolean=} source source
 * @property {Buffer} buffer buffer
 * @property {number=} size size
 * @property {BufferedMaps} maps maps
 * @property {(string | Buffer)[]=} hash hash
 */
declare class CachedSource extends Source {
	/**
	 * @param {Source | (() => Source)} source source
	 * @param {CachedData=} cachedData cached data
	 */
	constructor(
		source: Source | (() => Source),
		cachedData?: CachedData | undefined,
	);
	/**
	 * @type {Source | (() => Source)}
	 */
	_source: Source | (() => Source);
	/**
	 * @type {undefined | string}
	 */
	_cachedSource: undefined | string;
	/**
	 * @type {boolean | undefined}
	 */
	_cachedSourceType: boolean | undefined;
	/**
	 * @type {Buffer | undefined}
	 */
	_cachedBuffer: Buffer | undefined;
	/**
	 * @type {number | undefined}
	 */
	_cachedSize: number | undefined;
	/**
	 * @type {BufferedMaps | undefined}
	 */
	_cachedMaps: BufferedMaps | undefined;
	/**
	 * @type {(string | Buffer)[] | undefined}
	 */
	_cachedHashUpdate: (string | Buffer)[] | undefined;
	/**
	 * The map cache, created on first use: a source nobody asks a map of holds
	 * none, since V8 allocates a Map's hash table whether or not it is filled.
	 * @returns {BufferedMaps} map cache
	 */
	_getOrCreateCachedMaps(): BufferedMaps;
	/**
	 * @returns {CachedData} cached data
	 */
	getCachedData(): CachedData;
	originalLazy(): Source | (() => Source);
	original(): Source;
	/**
	 * @param {BufferEntry} cacheEntry cache entry
	 * @returns {null | RawSourceMap} raw source map
	 */
	_getMapFromCacheEntry(cacheEntry: BufferEntry): null | RawSourceMap;
	/**
	 * @returns {undefined | string} cached source
	 */
	_getCachedSource(): undefined | string;
	_cachedBuffers: Buffer<ArrayBufferLike>[] | undefined;
	/**
	 * @param {Options} options options
	 * @param {OnChunk} onChunk called for each chunk of code
	 * @param {OnSource} onSource called for each source
	 * @param {OnName} onName called for each name
	 * @returns {GeneratedSourceInfo} generated source info
	 */
	streamChunks(
		options: Options,
		onChunk: OnChunk,
		onSource: OnSource,
		onName: OnName,
	): GeneratedSourceInfo;
}
declare namespace CachedSource {
	export {
		ClearCacheOptions,
		HashLike,
		MapOptions,
		RawSourceMap,
		SourceAndMap,
		SourceValue,
		GeneratedSourceInfo,
		OnChunk,
		OnName,
		OnSource,
		Options,
		ScopeBindings,
		BufferedMap,
		ScopesReplay,
		BufferEntry,
		BufferedMaps,
		CachedData,
	};
}
import Source = require("./Source");
type ClearCacheOptions = import("./Source").ClearCacheOptions;
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
type Options = import("./helpers/streamChunks").Options;
type ScopeBindings = import("./helpers/streamChunks").ScopeBindings;
type BufferedMap = {
	/**
	 * version
	 */
	version: number;
	/**
	 * sources
	 */
	sources: string[];
	/**
	 * name
	 */
	names: string[];
	/**
	 * source root
	 */
	sourceRoot?: string | undefined;
	/**
	 * sources content
	 */
	sourcesContent?: (Buffer | "")[] | undefined;
	/**
	 * mappings
	 */
	mappings?: Buffer | undefined;
	/**
	 * file
	 */
	file: string;
};
/**
 * What replaying an entry streamed for a `scopes` request needs besides its
 * map. The map only keeps the encoded `scopes` field, so `bindings` holds, by
 * source index, the bindings each source reported. The field also appended
 * names to the map, and `names` counts the ones the stream itself reported,
 * so a replay reports the same names a fresh stream would.
 */
type ScopesReplay = {
	/**
	 * bindings by source index
	 */
	bindings: (ScopeBindings | undefined)[];
	/**
	 * number of names the stream reported
	 */
	names: number;
};
type BufferEntry = {
	map?: null | RawSourceMap;
	bufferedMap?: null | BufferedMap;
	scopes?: ScopesReplay;
};
type BufferedMaps = Map<string, BufferEntry>;
type CachedData = {
	/**
	 * source
	 */
	source?: boolean | undefined;
	/**
	 * buffer
	 */
	buffer: Buffer;
	/**
	 * size
	 */
	size?: number | undefined;
	/**
	 * maps
	 */
	maps: BufferedMaps;
	/**
	 * hash
	 */
	hash?: (string | Buffer)[] | undefined;
};
