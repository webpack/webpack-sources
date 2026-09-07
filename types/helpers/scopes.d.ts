export type RawSourceMap = import("../Source").RawSourceMap;
export type ScopeBindings = import("./streamChunks").ScopeBindings;
/**
 * A generated or original position, both counted from zero.
 */
export type ScopePosition = {
	/**
	 * line
	 */
	line: number;
	/**
	 * column
	 */
	column: number;
};
/**
 * One source's scope, and the span of generated code it explains.
 */
export type SourceScope = {
	/**
	 * index into the map's `sources`
	 */
	sourceIndex: number;
	/**
	 * the names the source declares
	 */
	variables: string[];
	/**
	 * the generated expression each name evaluates to
	 */
	values: string[];
	/**
	 * end of the original scope, exclusive
	 */
	originalEnd: ScopePosition;
	/**
	 * start of each generated range, inclusive
	 */
	rangeStarts: ScopePosition[];
	/**
	 * end of each generated range, exclusive
	 */
	rangeEnds: ScopePosition[];
};
/**
 * Adds the `scopes` field of the "Scopes" proposal to a source map, naming for
 * each source the bindings a debugger cannot resolve on its own and the
 * generated expression each one evaluates to. Does nothing when no source
 * contributes a binding.
 * @param {RawSourceMap} sourceMap the map to extend in place
 * @param {(sourceIndex: number) => Map<string, string> | undefined} getBindings binding expressions per source
 * @returns {void}
 */
export function addScopesToSourceMap(
	sourceMap: RawSourceMap,
	getBindings: (sourceIndex: number) => Map<string, string> | undefined,
): void;
/**
 * Groups a finished map's segments into one entry per source. Prefer the
 * collector when the segments are still being written, which saves decoding
 * back what was just encoded.
 * @param {string} mappings the map's `mappings` field
 * @param {number} sourceCount number of entries in the map's `sources`
 * @returns {SourceScope[]} one entry per source that the mappings reach, in source order
 */
export function collectSourceScopes(
	mappings: string,
	sourceCount: number,
): SourceScope[];
/**
 * Collects, segment by segment, the generated runs each source explains and how
 * far into it the map reaches. Both lines are counted from zero, so a caller
 * whose lines start at one subtracts before feeding a segment in.
 * @param {number=} sourceCount number of entries in the map's `sources`, when known
 * @returns {{ add: (generatedLine: number, generatedColumn: number, sourceIndex: number, originalLine: number) => void, finish: (lastLine: number) => SourceScope[] }} collector
 */
export function createScopeCollector(sourceCount?: number | undefined): {
	add: (
		generatedLine: number,
		generatedColumn: number,
		sourceIndex: number,
		originalLine: number,
	) => void;
	finish: (lastLine: number) => SourceScope[];
};
/**
 * Builds the `scopes` field while a map is being written, so the segments are
 * read as they are produced rather than decoded back out of `mappings`. Lines
 * are the one-based ones the chunk stream reports.
 * @returns {{ add: (generatedLine: number, generatedColumn: number, sourceIndex: number, originalLine: number) => void, addSource: (sourceIndex: number, scopeBindings?: ScopeBindings) => void, finish: (map: RawSourceMap, generatedLine: number) => void }} writer
 */
export function createScopesWriter(): {
	add: (
		generatedLine: number,
		generatedColumn: number,
		sourceIndex: number,
		originalLine: number,
	) => void;
	addSource: (sourceIndex: number, scopeBindings?: ScopeBindings) => void;
	finish: (map: RawSourceMap, generatedLine: number) => void;
};
/**
 * Encodes the scope tree into the `scopes` field of the proposal, appending any
 * name it needs to the map's `names`.
 * @param {SourceScope[]} scopes the scopes to encode, in source order
 * @param {number} sourceCount number of entries in the map's `sources`
 * @param {string[]} names the map's `names`, extended in place
 * @returns {string} the encoded `scopes` field
 */
export function encodeScopes(
	scopes: SourceScope[],
	sourceCount: number,
	names: string[],
): string;
