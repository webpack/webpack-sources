/*
 * helpers: stringBufferUtils
 *
 * Measures internString() with and without an active interning range
 * (which is what webpack toggles around layer transitions).
 */

import stringBufferUtils from "../../../lib/helpers/stringBufferUtils.js";
import { fixtureCode } from "../../fixtures.mjs";

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

	bench.add("helpers/stringBufferUtils: enter/exit interning range", () => {
		for (let i = 0; i < 500; i++) {
			stringBufferUtils.enterStringInterningRange();
			stringBufferUtils.exitStringInterningRange();
		}
	});
}
