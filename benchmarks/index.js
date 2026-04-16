/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { Bench } = require("tinybench");
const { withCodSpeed } = require("@codspeed/tinybench-plugin");

// Per-class benchmark suites. Each module exports a function that receives the
// bench instance and registers its benchmarks with `bench.add(...)`.
const suites = [
	require("./helpers"),
	require("./RawSource"),
	require("./OriginalSource"),
	require("./ReplaceSource"),
	require("./ConcatSource"),
	require("./PrefixSource"),
	require("./SourceMapSource"),
	require("./CachedSource"),
	require("./CompatSource"),
	require("./SizeOnlySource"),
];

const bench = withCodSpeed(
	new Bench({
		name: "webpack-sources",
		time: 500,
		warmupTime: 100,
	}),
);

for (const registerSuite of suites) {
	registerSuite(bench);
}

async function main() {
	await bench.run();
	console.table(bench.table());
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
