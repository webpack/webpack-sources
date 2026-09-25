export = CompatSource;
/** @typedef {import("./Source").ClearCacheOptions} ClearCacheOptions */
/** @typedef {import("./Source").HashLike} HashLike */
/** @typedef {import("./Source").MapOptions} MapOptions */
/** @typedef {import("./Source").RawSourceMap} RawSourceMap */
/** @typedef {import("./Source").SourceAndMap} SourceAndMap */
/** @typedef {import("./Source").SourceValue} SourceValue */
/**
 * @typedef {object} SourceLike
 * @property {() => SourceValue} source source
 * @property {(() => Buffer)=} buffer buffer
 * @property {(() => Buffer[])=} buffers buffers
 * @property {(() => number)=} size size
 * @property {((options?: MapOptions) => RawSourceMap | null)=} map map
 * @property {((options?: MapOptions) => SourceAndMap)=} sourceAndMap source and map
 * @property {((hash: HashLike) => void)=} updateHash hash updater
 * @property {((options?: ClearCacheOptions, visited?: WeakSet<Source>) => void)=} clearCache clear cache
 */
declare class CompatSource extends Source {
	/**
	 * @param {SourceLike} sourceLike source like
	 * @returns {Source} source
	 */
	static from(sourceLike: SourceLike): Source;
	/**
	 * @param {SourceLike} sourceLike source like
	 */
	constructor(sourceLike: SourceLike);
	/**
	 * @type {SourceLike}
	 */
	_sourceLike: SourceLike;
}
declare namespace CompatSource {
	export {
		ClearCacheOptions,
		HashLike,
		MapOptions,
		RawSourceMap,
		SourceAndMap,
		SourceValue,
		SourceLike,
	};
}
import Source = require("./Source");
type ClearCacheOptions = import("./Source").ClearCacheOptions;
type HashLike = import("./Source").HashLike;
type MapOptions = import("./Source").MapOptions;
type RawSourceMap = import("./Source").RawSourceMap;
type SourceAndMap = import("./Source").SourceAndMap;
type SourceValue = import("./Source").SourceValue;
type SourceLike = {
	/**
	 * source
	 */
	source: () => SourceValue;
	/**
	 * buffer
	 */
	buffer?: (() => Buffer) | undefined;
	/**
	 * buffers
	 */
	buffers?: (() => Buffer[]) | undefined;
	/**
	 * size
	 */
	size?: (() => number) | undefined;
	/**
	 * map
	 */
	map?: ((options?: MapOptions) => RawSourceMap | null) | undefined;
	/**
	 * source and map
	 */
	sourceAndMap?: ((options?: MapOptions) => SourceAndMap) | undefined;
	/**
	 * hash updater
	 */
	updateHash?: ((hash: HashLike) => void) | undefined;
	/**
	 * clear cache
	 */
	clearCache?:
		| ((options?: ClearCacheOptions, visited?: WeakSet<Source>) => void)
		| undefined;
};
