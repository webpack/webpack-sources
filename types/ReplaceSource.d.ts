export = ReplaceSource;
declare class ReplaceSource extends Source {
	/**
	 * @param {Source} source source
	 * @param {string=} name name
	 */
	constructor(source: Source, name?: string | undefined);
	/**
	 * @type {Source}
	 */
	_source: Source;
	/**
	 * @type {string | undefined}
	 */
	_name: string | undefined;
	/** @type {Replacement[]} */
	_replacements: Replacement[];
	/**
	 * @type {boolean}
	 */
	_isSorted: boolean;
	getName(): string | undefined;
	getReplacements(): Replacement[];
	/**
	 * @param {number} start start
	 * @param {number} end end
	 * @param {string} newValue new value
	 * @param {string=} name name
	 * @returns {void}
	 */
	replace(
		start: number,
		end: number,
		newValue: string,
		name?: string | undefined,
	): void;
	/**
	 * @param {number} pos pos
	 * @param {string} newValue new value
	 * @param {string=} name name
	 * @returns {void}
	 */
	insert(pos: number, newValue: string, name?: string | undefined): void;
	original(): Source;
	_sortReplacements(): void;
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
declare namespace ReplaceSource {
	export {
		Replacement,
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
declare class Replacement {
	/**
	 * @param {number} start start
	 * @param {number} end end
	 * @param {string} content content
	 * @param {string=} name name
	 */
	constructor(
		start: number,
		end: number,
		content: string,
		name?: string | undefined,
	);
	start: number;
	end: number;
	content: string;
	name: string | undefined;
	index: number | undefined;
}
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
