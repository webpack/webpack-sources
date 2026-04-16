/*
 * helpers: getGeneratedSourceInfo
 *
 * Quick scanner that returns the final line/column of a source. The hot
 * path on big sources was optimised to use String#indexOf in a loop.
 */

import { createRequire } from "module";
import { fixtureCode, bigSource } from "../../fixtures.mjs";

const require = createRequire(import.meta.url);
const getGeneratedSourceInfo = require(
	"../../../lib/helpers/getGeneratedSourceInfo",
);

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	bench.add("helpers/getGeneratedSourceInfo: fixture", () => {
		for (let i = 0; i < 100; i++) getGeneratedSourceInfo(fixtureCode);
	});

	bench.add("helpers/getGeneratedSourceInfo: big source", () => {
		getGeneratedSourceInfo(bigSource);
	});

	bench.add("helpers/getGeneratedSourceInfo: single line", () => {
		for (let i = 0; i < 10000; i++) getGeneratedSourceInfo("const a = 1;");
	});

	bench.add("helpers/getGeneratedSourceInfo: undefined", () => {
		for (let i = 0; i < 10000; i++) getGeneratedSourceInfo(undefined);
	});
}
