export = OriginalSource;
/** @typedef {import("./Source").ClearCacheOptions} ClearCacheOptions */
/** @typedef {import("./Source").HashLike} HashLike */
/** @typedef {import("./Source").MapOptions} MapOptions */
/** @typedef {import("./Source").RawSourceMap} RawSourceMap */
/** @typedef {import("./Source").SourceAndMap} SourceAndMap */
/** @typedef {import("./Source").SourceValue} SourceValue */
/** @typedef {import("./helpers/getGeneratedSourceInfo").GeneratedSourceInfo} GeneratedSourceInfo */
/** @typedef {import("./helpers/streamChunks").OnChunk} OnChunk */
/** @typedef {import("./helpers/streamChunks").OnName} OnName */
/** @typedef {import("./helpers/streamChunks").OnSource} OnSource */
/** @typedef {import("./helpers/streamChunks").Options} Options */
/** @typedef {import("./helpers/streamChunks").ScopeBindings} ScopeBindings */
declare class OriginalSource extends Source {
	/**
	 * @param {string | Buffer} value value
	 * @param {string} name name
	 * @param {ScopeBindings=} scopeBindings what each name this source declares
	 * evaluates to in the generated code, for the map's `scopes` field
	 */
	constructor(
		value: string | Buffer,
		name: string,
		scopeBindings?: ScopeBindings | undefined,
	);
	/**
	 * @type {undefined | string}
	 */
	_value: undefined | string;
	/**
	 * @type {undefined | Buffer}
	 */
	_valueAsBuffer: undefined | Buffer;
	/**
	 * @type {string}
	 */
	_name: string;
	/**
	 * @private
	 * @type {undefined | ScopeBindings}
	 */
	private _scopeBindings;
	getName(): string;
	_cachedSize: number | undefined;
	/**
	 * @param {Options} options options
	 * @param {OnChunk} onChunk called for each chunk of code
	 * @param {OnSource} onSource called for each source
	 * @param {OnName} _onName called for each name
	 * @returns {GeneratedSourceInfo} generated source info
	 */
	streamChunks(
		options: Options,
		onChunk: OnChunk,
		onSource: OnSource,
		_onName: OnName,
	): GeneratedSourceInfo;
}
declare namespace OriginalSource {
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
