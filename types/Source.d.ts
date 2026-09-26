export = Source;
/**
 * @typedef {object} MapOptions
 * @property {boolean=} columns need columns?
 * @property {boolean=} module is module
 * @property {boolean=} scopes emit the `scopes` field from the bindings the sources declare
 */
/**
 * @typedef {object} RawSourceMap
 * @property {number} version version
 * @property {string[]} sources sources
 * @property {string[]} names names
 * @property {string=} sourceRoot source root
 * @property {string[]=} sourcesContent sources content
 * @property {string} mappings mappings
 * @property {string} file file
 * @property {string=} debugId debug id
 * @property {number[]=} ignoreList ignore list
 * @property {string=} scopes encoded `scopes` field of the "Scopes" proposal
 */
/** @typedef {string | Buffer} SourceValue */
/**
 * @typedef {object} SourceAndMap
 * @property {SourceValue} source source
 * @property {RawSourceMap | null} map map
 */
/**
 * @typedef {object} HashLike
 * @property {(data: string | Buffer, inputEncoding?: string) => HashLike} update make hash update
 * @property {(encoding?: string) => string | Buffer} digest get hash digest
 */
/**
 * @typedef {object} ClearCacheOptions
 * @property {boolean=} maps drop cached source maps (default `true`)
 * @property {boolean=} source drop cached source/buffer copies (default `true`)
 * @property {boolean=} parsedMap drop the parsed object form of cached source maps on `SourceMapSource` instances (default `false` — re-parsing JSON is significantly more expensive than `toString`). Only takes effect when a serialized form (buffer or string) is also retained, so the data remains recoverable.
 */
declare class Source {
	/**
	 * @returns {SourceValue} source
	 */
	source(): SourceValue;
	/**
	 * @returns {Buffer} buffer
	 */
	buffer(): Buffer;
	/**
	 * @returns {Buffer[]} buffers
	 */
	buffers(): Buffer[];
	/**
	 * @returns {number} size
	 */
	size(): number;
	/**
	 * @param {MapOptions=} options map options
	 * @returns {RawSourceMap | null} map
	 */
	map(options?: MapOptions | undefined): RawSourceMap | null;
	/**
	 * @param {MapOptions=} options map options
	 * @returns {SourceAndMap} source and map
	 */
	sourceAndMap(options?: MapOptions | undefined): SourceAndMap;
	/**
	 * @param {HashLike} hash hash
	 * @returns {void}
	 */
	updateHash(hash: HashLike): void;
	/**
	 * Release cached data held by this source. clearCache is a memory
	 * hint: it never affects correctness or output, only how expensive
	 * the next read is. Subclasses override; the base is a no-op so
	 * every Source supports the call. Composite sources always recurse
	 * into wrapped sources. When the same child is reachable via several
	 * parents (e.g. modules shared across webpack chunks), pass a shared
	 * `visited` WeakSet so each subtree is walked at most once.
	 * Not safe to call concurrently with source/map/sourceAndMap/
	 * streamChunks/updateHash on the same instance.
	 * @param {ClearCacheOptions=} options selectors
	 * @param {WeakSet<Source>=} visited de-duplication set shared across calls
	 * @returns {void}
	 */
	clearCache(
		options?: ClearCacheOptions | undefined,
		visited?: WeakSet<Source> | undefined,
	): void;
}
declare namespace Source {
	export {
		MapOptions,
		RawSourceMap,
		SourceValue,
		SourceAndMap,
		HashLike,
		ClearCacheOptions,
	};
}
type MapOptions = {
	/**
	 * need columns?
	 */
	columns?: boolean | undefined;
	/**
	 * is module
	 */
	module?: boolean | undefined;
	/**
	 * emit the `scopes` field from the bindings the sources declare
	 */
	scopes?: boolean | undefined;
};
type RawSourceMap = {
	/**
	 * version
	 */
	version: number;
	/**
	 * sources
	 */
	sources: string[];
	/**
	 * names
	 */
	names: string[];
	/**
	 * source root
	 */
	sourceRoot?: string | undefined;
	/**
	 * sources content
	 */
	sourcesContent?: string[] | undefined;
	/**
	 * mappings
	 */
	mappings: string;
	/**
	 * file
	 */
	file: string;
	/**
	 * debug id
	 */
	debugId?: string | undefined;
	/**
	 * ignore list
	 */
	ignoreList?: number[] | undefined;
	/**
	 * encoded `scopes` field of the "Scopes" proposal
	 */
	scopes?: string | undefined;
};
type SourceValue = string | Buffer;
type SourceAndMap = {
	/**
	 * source
	 */
	source: SourceValue;
	/**
	 * map
	 */
	map: RawSourceMap | null;
};
type HashLike = {
	/**
	 * make hash update
	 */
	update: (data: string | Buffer, inputEncoding?: string) => HashLike;
	/**
	 * get hash digest
	 */
	digest: (encoding?: string) => string | Buffer;
};
type ClearCacheOptions = {
	/**
	 * drop cached source maps (default `true`)
	 */
	maps?: boolean | undefined;
	/**
	 * drop cached source/buffer copies (default `true`)
	 */
	source?: boolean | undefined;
	/**
	 * drop the parsed object form of cached source maps on `SourceMapSource` instances (default `false` — re-parsing JSON is significantly more expensive than `toString`). Only takes effect when a serialized form (buffer or string) is also retained, so the data remains recoverable.
	 */
	parsedMap?: boolean | undefined;
};
