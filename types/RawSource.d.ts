export = RawSource;
declare class RawSource extends Source {
	/**
	 * @param {string | Uint8Array} value value
	 * @param {boolean=} convertToString convert to string
	 */
	constructor(
		value: string | Uint8Array,
		convertToString?: boolean | undefined,
	);
	/**
	 * @type {boolean}
	 */
	_valueIsBuffer: boolean;
	/**
	 * @type {undefined | string | Buffer}
	 */
	_value: undefined | string | Buffer;
	/**
	 * @type {undefined | Buffer}
	 */
	_valueAsBuffer: undefined | Buffer;
	/**
	 * @type {undefined | string}
	 */
	_valueAsString: undefined | string;
	isBuffer(): boolean;
	_cachedSize: number | undefined;
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
declare namespace RawSource {
	export {
		ClearCacheOptions,
		HashLike,
		MapOptions,
		RawSourceMap,
		SourceValue,
		GeneratedSourceInfo,
		OnChunk,
		OnName,
		OnSource,
		Options,
	};
}
import Source = require("./Source");
type ClearCacheOptions = import("./Source").ClearCacheOptions;
type HashLike = import("./Source").HashLike;
type MapOptions = import("./Source").MapOptions;
type RawSourceMap = import("./Source").RawSourceMap;
type SourceValue = import("./Source").SourceValue;
type GeneratedSourceInfo =
	import("./helpers/getGeneratedSourceInfo").GeneratedSourceInfo;
type OnChunk = import("./helpers/streamChunks").OnChunk;
type OnName = import("./helpers/streamChunks").OnName;
type OnSource = import("./helpers/streamChunks").OnSource;
type Options = import("./helpers/streamChunks").Options;
