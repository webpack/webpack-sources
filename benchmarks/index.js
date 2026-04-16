/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const fs = require("fs");
const path = require("path");
const { Bench } = require("tinybench");
const { withCodSpeed } = require("@codspeed/tinybench-plugin");

const {
	RawSource,
	OriginalSource,
	ReplaceSource,
	ConcatSource,
	SourceMapSource,
	PrefixSource,
	CachedSource,
} = require("../lib");
const splitIntoLines = require("../lib/helpers/splitIntoLines");
const splitIntoPotentialTokens = require("../lib/helpers/splitIntoPotentialTokens");
const getGeneratedSourceInfo = require("../lib/helpers/getGeneratedSourceInfo");

const fixtureCode = fs.readFileSync(
	path.join(__dirname, "..", "test", "fixtures", "es6-promise.js"),
	"utf8",
);
const fixtureMap = JSON.parse(
	fs.readFileSync(
		path.join(__dirname, "..", "test", "fixtures", "es6-promise.map"),
		"utf8",
	),
);

// Larger synthetic source to exercise scan-heavy paths
const bigLineCount = 20000;
const bigSource = Array.from(
	{ length: bigLineCount },
	(_, i) => `const value${i} = ${i} * 2; // line ${i}`,
).join("\n");

// A source with a single very long line (to exercise indexOf-based scanning)
const longLine = `${"a".repeat(100000)}\n${"b".repeat(100000)}\n${"c".repeat(100000)}`;

const bench = withCodSpeed(
	new Bench({
		name: "webpack-sources",
		time: 500,
		warmupTime: 100,
	}),
);

bench
	// -------- helpers --------
	.add("helpers: splitIntoLines (fixture)", () => {
		splitIntoLines(fixtureCode);
	})
	.add("helpers: splitIntoLines (big source)", () => {
		splitIntoLines(bigSource);
	})
	.add("helpers: splitIntoLines (long lines)", () => {
		splitIntoLines(longLine);
	})
	.add("helpers: splitIntoPotentialTokens (fixture)", () => {
		splitIntoPotentialTokens(fixtureCode);
	})
	.add("helpers: getGeneratedSourceInfo (big source)", () => {
		getGeneratedSourceInfo(bigSource);
	})

	// -------- RawSource --------
	.add("RawSource: source()", () => {
		new RawSource(fixtureCode).source();
	})
	.add("RawSource: buffer()", () => {
		new RawSource(fixtureCode).buffer();
	})
	.add("RawSource: streamChunks()", () => {
		const src = new RawSource(fixtureCode);
		src.streamChunks({}, () => {}, () => {}, () => {});
	})

	// -------- OriginalSource --------
	.add("OriginalSource: source()", () => {
		new OriginalSource(fixtureCode, "fixture.js").source();
	})
	.add("OriginalSource: map()", () => {
		new OriginalSource(fixtureCode, "fixture.js").map({});
	})
	.add("OriginalSource: sourceAndMap()", () => {
		new OriginalSource(fixtureCode, "fixture.js").sourceAndMap({});
	})
	.add("OriginalSource: sourceAndMap({columns:false})", () => {
		new OriginalSource(fixtureCode, "fixture.js").sourceAndMap({
			columns: false,
		});
	})
	.add("OriginalSource: streamChunks()", () => {
		const src = new OriginalSource(fixtureCode, "fixture.js");
		src.streamChunks({}, () => {}, () => {}, () => {});
	})

	// -------- ReplaceSource --------
	.add("ReplaceSource: source() (many small replacements)", () => {
		const src = new ReplaceSource(new OriginalSource(bigSource, "big.js"));
		// Replace each "value" identifier with "v"
		let idx = bigSource.indexOf("value");
		let count = 0;
		while (idx !== -1 && count < 1000) {
			src.replace(idx, idx + 4, "v");
			idx = bigSource.indexOf("value", idx + 5);
			count++;
		}
		src.source();
	})
	.add("ReplaceSource: source() (few large replacements)", () => {
		const src = new ReplaceSource(new OriginalSource(bigSource, "big.js"));
		src.replace(100, 500, "/* replaced */");
		src.replace(5000, 8000, "/* replaced */");
		src.replace(20000, 30000, "/* replaced */");
		src.source();
	})
	.add("ReplaceSource: map()", () => {
		const src = new ReplaceSource(new OriginalSource(fixtureCode, "fix.js"));
		src.replace(0, 10, "/* hdr */");
		src.insert(200, "// inj\n");
		src.map({});
	})

	// -------- ConcatSource --------
	.add("ConcatSource: source() (10 raw)", () => {
		const parts = [];
		for (let i = 0; i < 10; i++) parts.push(new RawSource(fixtureCode));
		new ConcatSource(...parts).source();
	})
	.add("ConcatSource: streamChunks() (mixed)", () => {
		const cs = new ConcatSource(
			new RawSource("// header\n"),
			new OriginalSource(fixtureCode, "a.js"),
			"\n// middle\n",
			new OriginalSource(fixtureCode, "b.js"),
		);
		cs.streamChunks(
			{ finalSource: true },
			() => {},
			() => {},
			() => {},
		);
	})

	// -------- PrefixSource --------
	.add("PrefixSource: sourceAndMap()", () => {
		const ps = new PrefixSource(
			"\t",
			new OriginalSource(fixtureCode, "fixture.js"),
		);
		ps.sourceAndMap({});
	})

	// -------- SourceMapSource --------
	.add("SourceMapSource: sourceAndMap()", () => {
		new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).sourceAndMap({});
	})
	.add("SourceMapSource: streamChunks()", () => {
		const src = new SourceMapSource(fixtureCode, "fixture.js", fixtureMap);
		src.streamChunks({}, () => {}, () => {}, () => {});
	})

	// -------- CachedSource --------
	.add("CachedSource: first source()/map() then reuse", () => {
		const src = new CachedSource(
			new OriginalSource(fixtureCode, "fixture.js"),
		);
		src.source();
		src.map({});
		src.source();
		src.size();
		src.buffer();
	});

async function main() {
	await bench.run();
	// Print a simple table - tinybench's default table includes latency/throughput
	console.table(bench.table());
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
