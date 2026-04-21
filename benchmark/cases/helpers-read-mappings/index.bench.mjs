/*
 * helpers: readMappings
 *
 * The VLQ decoder used by every source-map aware code path. Measured
 * separately so instruction-count regressions in the decoder itself are
 * visible without the per-chunk onMapping overhead that streamChunksOf*
 * adds.
 */

import readMappings from "../../../lib/helpers/readMappings.js";
import { fixtureMap, noop } from "../../fixtures.mjs";

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	const { mappings } = fixtureMap;

	bench.add("helpers/readMappings: fixture (noop callback)", () => {
		for (let i = 0; i < 20; i++) readMappings(mappings, noop);
	});

	bench.add("helpers/readMappings: fixture (counting callback)", () => {
		let n = 0;
		readMappings(mappings, () => {
			n++;
		});
		if (n < 0) throw new Error("unreachable");
	});
}
