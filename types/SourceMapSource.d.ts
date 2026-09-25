export = SourceMapSource;
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
declare class SourceMapSource extends Source {
	/**
	 * @param {string | Buffer} value value
	 * @param {string} name name
	 * @param {string | Buffer | RawSourceMap=} sourceMap source map
	 * @param {SourceValue=} originalSource original source
	 * @param {(null | string | Buffer | RawSourceMap)=} innerSourceMap inner source map
	 * @param {boolean=} removeOriginalSource do remove original source
	 */
	constructor(
		value: string | Buffer,
		name: string,
		sourceMap?: (string | Buffer | RawSourceMap) | undefined,
		originalSource?: SourceValue | undefined,
		innerSourceMap?: (null | string | Buffer | RawSourceMap) | undefined,
		removeOriginalSource?: boolean | undefined,
	);
	/**
	 * @type {undefined | string}
	 */
	_valueAsString: undefined | string;
	/**
	 * @type {undefined | Buffer}
	 */
	_valueAsBuffer: undefined | Buffer;
	_name: string;
	_hasSourceMap: boolean;
	/**
	 * @type {undefined | RawSourceMap}
	 */
	_sourceMapAsObject: undefined | RawSourceMap;
	/**
	 * @type {undefined | string}
	 */
	_sourceMapAsString: undefined | string;
	/**
	 * @type {undefined | Buffer}
	 */
	_sourceMapAsBuffer: undefined | Buffer;
	_hasOriginalSource: boolean;
	_originalSourceAsString: string | undefined;
	_originalSourceAsBuffer: Buffer<ArrayBufferLike> | undefined;
	_hasInnerSourceMap: boolean;
	/**
	 * @type {undefined | RawSourceMap}
	 */
	_innerSourceMapAsObject: undefined | RawSourceMap;
	/**
	 * @type {undefined | string}
	 */
	_innerSourceMapAsString: undefined | string;
	/**
	 * @type {undefined | Buffer}
	 */
	_innerSourceMapAsBuffer: undefined | Buffer;
	_removeOriginalSource: boolean | undefined;
	/**
	 * @returns {[Buffer, string, Buffer, Buffer | undefined, Buffer | undefined, boolean | undefined]} args
	 */
	getArgsAsBuffers(): [
		Buffer,
		string,
		Buffer,
		Buffer | undefined,
		Buffer | undefined,
		boolean | undefined,
	];
	_cachedSize: number | undefined;
	/**
	 * @returns {undefined | Buffer} buffer
	 */
	_originalSourceBuffer(): undefined | Buffer;
	_originalSourceString(): string | undefined;
	_innerSourceMapObject(): any;
	_innerSourceMapBuffer(): Buffer<ArrayBufferLike> | undefined;
	/**
	 * @returns {string} result
	 */
	_innerSourceMapString(): string;
	_sourceMapObject(): any;
	_sourceMapBuffer(): Buffer<ArrayBufferLike>;
	_sourceMapString(): string;
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
declare namespace SourceMapSource {
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
