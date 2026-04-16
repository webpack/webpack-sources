/*
 * Shared fixtures for benchmark cases.
 *
 * Each case can import what it needs from here. We read the fixture files
 * from the existing test fixture directory so the benchmarks run against
 * realistic source content and matching source maps.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "..", "test", "fixtures");

export const fixtureCode = fs.readFileSync(
	path.join(fixturesDir, "es6-promise.js"),
	"utf8",
);

export const fixtureMap = JSON.parse(
	fs.readFileSync(path.join(fixturesDir, "es6-promise.map"), "utf8"),
);

export const fixtureBuffer = Buffer.from(fixtureCode, "utf8");
export const fixtureMapString = JSON.stringify(fixtureMap);
export const fixtureMapBuffer = Buffer.from(fixtureMapString, "utf8");

// Synthetic multi-line source (~20k lines). Exercises scan-heavy paths
// (splitIntoLines, OriginalSource column walking, etc.).
export const bigSource = Array.from(
	{ length: 20000 },
	(_, i) => `const value${i} = ${i} * 2; // line ${i}`,
).join("\n");

// Synthetic source with a few very long lines (exercises indexOf-based
// scanning).
export const longLineSource = `${"a".repeat(100000)}\n${"b".repeat(
	100000,
)}\n${"c".repeat(100000)}`;

// Small source useful when we want the constructor / method pair to
// dominate the measurement.
export const smallSource = `function hello(name) {\n\tconsole.log("hi " + name);\n}\nhello("world");\n`;

// Noop callbacks for streamChunks benchmarks. Reused so V8 can optimise
// them into a known-shape function.
export const noop = () => {};
