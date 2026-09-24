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
	 * @type {BufferedMaps}
	 */
	_cachedMaps: BufferedMaps;
	/**
	 * @type {(string | Buffer)[] | undefined}
	 */
	_cachedHashUpdate: (string | Buffer)[] | undefined;
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
		BufferedMap,
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
type BufferEntry = {
	map?: null | RawSourceMap;
	bufferedMap?: null | BufferedMap;
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
