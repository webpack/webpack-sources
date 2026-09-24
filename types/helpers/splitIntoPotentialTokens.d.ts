export = splitIntoPotentialTokens;
/**
 * Array-returning variant. Kept as a standalone loop rather than wrapping
 * `eachPotentialToken` with a per-token callback: the callback indirection
 * measurably slows this hot scan (V8 can no longer inline the slice/push),
 * and the two only share the same small, well-tested classification table.
 * @param {string} str string
 * @returns {string[] | null} array of string separated by potential tokens
 */
declare function splitIntoPotentialTokens(str: string): string[] | null;
declare namespace splitIntoPotentialTokens {
	export { eachPotentialToken, OnPotentialToken };
}
/**
 * @callback OnPotentialToken
 * @param {number} start start offset (inclusive)
 * @param {number} end end offset (exclusive)
 * @param {boolean} newline whether the token ends with a `\n`
 * @returns {void}
 */
/**
 * Streaming core: report each potential token by its `[start, end)` bounds
 * instead of materialising substrings. The single real consumer
 * (`OriginalSource.streamChunks`) slices on demand — and skips slicing
 * entirely when emitting the final source (the `map()` / `sourceAndMap()`
 * paths, which discard the chunk text) — so this avoids both the
 * intermediate results array and every per-token `String.slice` allocation
 * in the dominant case.
 * @param {string} str string
 * @param {OnPotentialToken} onToken called for each token
 * @returns {void}
 */
declare function eachPotentialToken(
	str: string,
	onToken: OnPotentialToken,
): void;
type OnPotentialToken = (start: number, end: number, newline: boolean) => void;
