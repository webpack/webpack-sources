/**
 * Disables the optimization to save both string and buffer in memory. This
 * may increase performance but should reduce memory usage in the Webpack
 * compiler.
 * @returns {void}
 */
export function disableDualStringBufferCaching(): void;
/**
 * Enables an optimization to save both string and buffer in memory to avoid
 * repeat conversions between the two formats when they are requested. This
 * is enabled by default. This option can improve performance but can consume
 * additional memory since values are stored twice.
 * @returns {void}
 */
export function enableDualStringBufferCaching(): void;
/**
 * Starts a memory optimization to avoid repeat copies of the same string in
 * memory by caching a single reference to the string. This can reduce memory
 * usage if the same string is repeated many times in the compiler, such as
 * when Webpack layers are used with the same files.
 *
 * {@link exitStringInterningRange} should be called when string interning is
 * no longer necessary to free up the memory used by the interned strings. If
 * {@link enterStringInterningRange} has been called multiple times, then
 * this method may not immediately free all the memory until
 * {@link exitStringInterningRange} has been called to end all string
 * interning ranges.
 * @returns {void}
 */
export function enterStringInterningRange(): void;
/**
 * Stops the current string interning range. Once all string interning ranges
 * have been exited, this method will free all the memory used by the interned
 * strings. This method should be called once for each time that
 * {@link enterStringInterningRange} was called.
 * @returns {void}
 */
export function exitStringInterningRange(): void;
/**
 * Saves the string in a map to ensure that only one copy of the string exists
 * in memory at a given time. This is controlled by {@link enableStringInterning}
 * and {@link disableStringInterning}. Callers are expect to manage the memory
 * of the interned strings by calling {@link disableStringInterning} after the
 * compiler no longer needs to save the interned memory.
 * @param {string} str A string to be interned.
 * @returns {string} The original string or a reference to an existing string of the same value if it has already been interned.
 */
export function internString(str: string): string;
/**
 * @returns {boolean} Whether the optimization to cache copies of both the
 * string and buffer version of source content is enabled. This is enabled by
 * default to improve performance but can consume more memory since values are
 * stored twice.
 */
export function isDualStringBufferCachingEnabled(): boolean;
