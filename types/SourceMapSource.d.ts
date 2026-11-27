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
	 * @param {string | Uint8Array} value value
	 * @param {string} name name
	 * @param {string | Uint8Array | RawSourceMap=} sourceMap source map
	 * @param {string | Uint8Array=} originalSource original source
	 * @param {(null | string | Uint8Array | RawSourceMap)=} innerSourceMap inner source map
	 * @param {boolean=} removeOriginalSource do remove original source
	 */
	constructor(
		value: string | Uint8Array,
		name: string,
		sourceMap?: (string | Uint8Array | RawSourceMap) | undefined,
		originalSource?: (string | Uint8Array) | undefined,
		innerSourceMap?: (null | string | Uint8Array | RawSourceMap) | undefined,
		removeOriginalSource?: boolean | undefined,
	);
	/**
	 * @type {undefined | string}
	 */
	_valueAsString: undefined | string;
	/**
	 * @type {undefined | Uint8Array}
	 */
	_valueAsBuffer: undefined | Uint8Array;
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
	 * @type {undefined | Uint8Array}
	 */
	_sourceMapAsBuffer: undefined | Uint8Array;
	_hasOriginalSource: boolean;
	_originalSourceAsString: string | undefined;
	_originalSourceAsBuffer: Uint8Array<ArrayBufferLike> | undefined;
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
	 * @type {undefined | Uint8Array}
	 */
	_innerSourceMapAsBuffer: undefined | Uint8Array;
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
	 * @returns {undefined | Uint8Array} buffer
	 */
	_originalSourceBuffer(): undefined | Uint8Array;
	_originalSourceString(): string | undefined;
	_innerSourceMapObject(): any;
	_innerSourceMapBuffer():
		Uint8Array<ArrayBufferLike> | Buffer<ArrayBufferLike> | undefined;
	/**
	 * @returns {string} result
	 */
	_innerSourceMapString(): string;
	_sourceMapObject(): any;
	_sourceMapBuffer(): Uint8Array<ArrayBufferLike> | Buffer<ArrayBufferLike>;
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
