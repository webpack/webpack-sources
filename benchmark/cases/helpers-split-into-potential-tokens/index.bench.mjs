/*
 * helpers: splitIntoPotentialTokens
 *
 * Used by OriginalSource when column-aware mappings are requested. Scans
 * for \n ; { } and runs of separator characters.
 */

import { createRequire } from "module";
import { fixtureCode, bigSource } from "../../fixtures.mjs";

const require = createRequire(import.meta.url);
const splitIntoPotentialTokens = require(
	"../../../lib/helpers/splitIntoPotentialTokens",
);

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
