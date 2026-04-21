/*
 * helpers: splitIntoPotentialTokens
 *
 * Used by OriginalSource when column-aware mappings are requested. Scans
 * for \n ; { } and runs of separator characters.
 */

import splitIntoPotentialTokens from "../../../lib/helpers/splitIntoPotentialTokens.js";
import { bigSource, fixtureCode } from "../../fixtures.mjs";

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	bench.add("helpers/splitIntoPotentialTokens: fixture", () => {
		for (let i = 0; i < 20; i++) splitIntoPotentialTokens(fixtureCode);
	});

	bench.add("helpers/splitIntoPotentialTokens: big source", () => {
		splitIntoPotentialTokens(bigSource);
	});
}
