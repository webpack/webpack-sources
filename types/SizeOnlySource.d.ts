export = SizeOnlySource;
/** @typedef {import("./Source").HashLike} HashLike */
/** @typedef {import("./Source").MapOptions} MapOptions */
/** @typedef {import("./Source").RawSourceMap} RawSourceMap */
/** @typedef {import("./Source").SourceValue} SourceValue */
declare class SizeOnlySource extends Source {
	/**
	 * @param {number} size size
	 */
	constructor(size: number);
	/**
	 * @type {number}
	 */
	_size: number;
	_error(): Error;
}
declare namespace SizeOnlySource {
	export { HashLike, MapOptions, RawSourceMap, SourceValue };
}
import Source = require("./Source");
type HashLike = import("./Source").HashLike;
type MapOptions = import("./Source").MapOptions;
type RawSourceMap = import("./Source").RawSourceMap;
type SourceValue = import("./Source").SourceValue;
