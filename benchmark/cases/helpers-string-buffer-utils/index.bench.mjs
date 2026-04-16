/*
 * helpers: stringBufferUtils
 *
 * Measures internString() with and without an active interning range
 * (which is what webpack toggles around layer transitions).
 */

import { createRequire } from "module";
import { fixtureCode } from "../../fixtures.mjs";

const require = createRequire(import.meta.url);
const stringBufferUtils = require("../../../lib/helpers/stringBufferUtils");

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	bench.add("helpers/stringBufferUtils: internString (disabled)", () => {
		for (let i = 0; i < 500; i++) stringBufferUtils.internString(fixtureCode);
	});

	bench.add("helpers/stringBufferUtils: internString (enabled)", () => {
		stringBufferUtils.enterStringInterningRange();
		try {
			for (let i = 0; i < 500; i++) stringBufferUtils.internString(fixtureCode);
		} finally {
			stringBufferUtils.exitStringInterningRange();
		}
	});

	bench.add(
		"helpers/stringBufferUtils: enter/exit interning range",
		() => {
			for (let i = 0; i < 500; i++) {
				stringBufferUtils.enterStringInterningRange();
				stringBufferUtils.exitStringInterningRange();
			}
		},
	);
}
