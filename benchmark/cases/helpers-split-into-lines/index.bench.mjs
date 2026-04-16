/*
 * helpers: splitIntoLines
 *
 * Core scanning primitive used by every streaming code path. We cover the
 * fixture, a synthetic many-lines source, a few-very-long-lines source,
 * and the empty-string fast path.
 */

import { createRequire } from "module";
import {
	fixtureCode,
	bigSource,
	longLineSource,
} from "../../fixtures.mjs";

const require = createRequire(import.meta.url);
const splitIntoLines = require("../../../lib/helpers/splitIntoLines");

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	bench.add("helpers/splitIntoLines: fixture", () => {
		for (let i = 0; i < 100; i++) splitIntoLines(fixtureCode);
	});

	bench.add("helpers/splitIntoLines: big source", () => {
		splitIntoLines(bigSource);
	});

	bench.add("helpers/splitIntoLines: long lines", () => {
		for (let i = 0; i < 100; i++) splitIntoLines(longLineSource);
	});

	bench.add("helpers/splitIntoLines: empty", () => {
		for (let i = 0; i < 10000; i++) splitIntoLines("");
	});
}
