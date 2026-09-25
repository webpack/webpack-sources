export = ConcatSource;
declare class ConcatSource extends Source {
	/**
	 * @param {Child[]} args children
	 */
	constructor(...args: Child[]);
	/**
	 * @type {Child[]}
	 */
	_children: Child[];
	/**
	 * @type {boolean}
	 */
	_isOptimized: boolean;
	/**
	 * @returns {Source[]} children
	 */
	getChildren(): Source[];
	/**
	 * @param {Child} item item
	 * @returns {void}
	 */
	add(item: Child): void;
	/**
	 * @param {Child[]} items items
	 * @returns {void}
	 */
	addAllSkipOptimizing(items: Child[]): void;
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
	_optimize(): void;
}
declare namespace ConcatSource {
	export {
		SourceLike,
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
		Child,
	};
}
import Source = require("./Source");
type SourceLike = import("./CompatSource").SourceLike;
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
type Child = string | Source | SourceLike;
