/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const fs = require("fs");
const path = require("path");

const fixturesDir = path.join(__dirname, "..", "..", "test", "fixtures");

const fixtureCode = fs.readFileSync(
	path.join(fixturesDir, "es6-promise.js"),
	"utf8",
);
const fixtureMap = JSON.parse(
	fs.readFileSync(path.join(fixturesDir, "es6-promise.map"), "utf8"),
);
const fixtureBuffer = Buffer.from(fixtureCode, "utf8");

// Synthetic multi-line source (~20k lines). Exercises scan-heavy paths.
const bigLineCount = 20000;
const bigSource = Array.from(
	{ length: bigLineCount },
	(_, i) => `const value${i} = ${i} * 2; // line ${i}`,
).join("\n");

// Synthetic source with a few very long lines (exercises indexOf-based scanning).
const longLine = `${"a".repeat(100000)}\n${"b".repeat(100000)}\n${"c".repeat(100000)}`;

// Small source used where we want the constructor+method pair to dominate.
const smallSource = `function hello(name) {\n\tconsole.log("hi " + name);\n}\nhello("world");\n`;

// A minimal valid source map describing the small fixture.
const smallMap = {
	version: 3,
	file: "small.js",
	sources: ["small-orig.js"],
	sourcesContent: [smallSource],
	names: ["hello", "name"],
	mappings: "AAAA,SAASA,MAAMC,KAAK;CACnB;AACD",
};

// Noop callbacks for streamChunks benchmarks.
const noop = () => {};

module.exports = {
	fixtureCode,
	fixtureMap,
	fixtureBuffer,
	bigSource,
	longLine,
	smallSource,
	smallMap,
	noop,
};
