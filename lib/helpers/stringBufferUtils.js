/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Mark Knichel @mknichel
*/

"use strict";

let dualStringBufferCaching = true;

/**
 * @returns {boolean} Whether the optimization to cache copies of both the
 * string and buffer version of source content is enabled. This is enabled by
 * default to improve performance but can consume more memory since values are
 * stored twice.
 */
function isDualStringBufferCachingEnabled() {
	return dualStringBufferCaching;
}

/**
 * Enables an optimization to save both string and buffer in memory to avoid
 * repeat conversions between the two formats when they are requested. This
 * is enabled by default. This option can improve performance but can consume
 * additional memory since values are stored twice.
 *
 * @returns {void}
 */
function enableDualStringBufferCaching() {
	dualStringBufferCaching = true;
}

/**
 * Disables the optimization to save both string and buffer in memory. This
 * may increase performance but should reduce memory usage in the Webpack
 * compiler.
 *
 * @returns {void}
 */
function disableDualStringBufferCaching() {
	dualStringBufferCaching = false;
}

const interningStringMap = new Map();

/**
 * Saves the string in a map to ensure that only one copy of the string exists
 * in memory at a given time. This is controlled by {@link enableStringInterning}
 * and {@link disableStringInterning}. Callers are expect to manage the memory
 * of the interned strings by calling {@link disableStringInterning} after the
 * compiler no longer needs to save the interned memory.
 *
 * @param {string} str A string to be interned.
 * @returns {string} The original string or a reference to an existing string
 * of the same value if it has already been interned.
 */
function internString(str) {
	if (!isStringInterningEnabled() || !str || typeof str !== "string") {
		return str;
	}
	let internedString = interningStringMap.get(str);
	if (internedString === undefined) {
		internedString = str;
		interningStringMap.set(str, internedString);
	}
	return internedString;
}

let enableStringInterningRefCount = 0;

function isStringInterningEnabled() {
	return enableStringInterningRefCount > 0;
}

/**
 * Enables a memory optimization to avoid repeat copies of the same string in
 * memory by caching a single reference to the string. This can reduce memory
 * usage if the same string is repeated many times in the compiler, such as
 * when Webpack layers are used with the same files.
 *
 * @returns {void}
 */
function enableStringInterning() {
	enableStringInterningRefCount++;
}

/**
 * Disables string interning. This should be called to free the memory used by
 * the interned strings after the compiler no longer needs to reuse the
 * interned strings such as at the end of the compilation.
 *
 * @returns {void}
 */
function disableStringInterning() {
	if (--enableStringInterningRefCount <= 0) {
		interningStringMap.clear();
		enableStringInterningRefCount = 0;
	}
}

module.exports = {
	disableDualStringBufferCaching,
	disableStringInterning,
	enableDualStringBufferCaching,
	enableStringInterning,
	internString,
	isDualStringBufferCachingEnabled
};
