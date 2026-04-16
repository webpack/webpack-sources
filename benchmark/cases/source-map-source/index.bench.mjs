/*
 * source-map-source
 *
 * SourceMapSource is the heaviest single class — it covers both standalone
 * sources-with-maps and the combined-source-map path (outer map + inner
 * map). We exercise every public method, both input variants (object /
 * string / Buffer), and both streaming layouts (full / lines-only).
 */

import { createRequire } from "module";
import { createHash } from "crypto";
import {
	fixtureCode,
	fixtureBuffer,
	fixtureMap,
	fixtureMapString,
	fixtureMapBuffer,
	noop,
} from "../../fixtures.mjs";

const require = createRequire(import.meta.url);
const { SourceMapSource } = require("../../../lib");

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	bench.add("source-map-source: new (object map)", () => {
		for (let i = 0; i < 50; i++) {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap);
		}
	});

	bench.add("source-map-source: new (string map)", () => {
		for (let i = 0; i < 50; i++) {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMapString);
		}
	});

	bench.add("source-map-source: new (buffer map)", () => {
		for (let i = 0; i < 50; i++) {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMapBuffer);
		}
	});

	bench.add("source-map-source: new (buffer value)", () => {
		for (let i = 0; i < 50; i++) {
			new SourceMapSource(fixtureBuffer, "fixture.js", fixtureMap);
		}
	});

	bench.add("source-map-source: source()", () => {
		for (let i = 0; i < 100; i++) {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).source();
		}
	});

	bench.add("source-map-source: buffer()", () => {
		for (let i = 0; i < 50; i++) {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).buffer();
		}
	});

	bench.add("source-map-source: size()", () => {
		for (let i = 0; i < 50; i++) {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).size();
		}
	});

	bench.add("source-map-source: getArgsAsBuffers()", () => {
		for (let i = 0; i < 20; i++) {
			new SourceMapSource(
				fixtureCode,
				"fixture.js",
				fixtureMap,
			).getArgsAsBuffers();
		}
	});

	bench.add("source-map-source: map()", () => {
		for (let i = 0; i < 100; i++) {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).map({});
		}
	});

	bench.add("source-map-source: map({columns:false})", () => {
		for (let i = 0; i < 100; i++) {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).map({
				columns: false,
			});
		}
	});

	bench.add("source-map-source: sourceAndMap()", () => {
		for (let i = 0; i < 50; i++) {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).sourceAndMap(
				{},
			);
		}
	});

	bench.add("source-map-source: sourceAndMap({columns:false})", () => {
		for (let i = 0; i < 50; i++) {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).sourceAndMap({
				columns: false,
			});
		}
	});

	bench.add("source-map-source: streamChunks()", () => {
		for (let i = 0; i < 5; i++) {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).streamChunks(
				{},
				noop,
				noop,
				noop,
			);
		}
	});

	bench.add("source-map-source: streamChunks({columns:false})", () => {
		for (let i = 0; i < 5; i++) {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).streamChunks(
				{ columns: false },
				noop,
				noop,
				noop,
			);
		}
	});

	bench.add("source-map-source: streamChunks({finalSource:true})", () => {
		for (let i = 0; i < 5; i++) {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).streamChunks(
				{ finalSource: true },
				noop,
				noop,
				noop,
			);
		}
	});

	bench.add("source-map-source: streamChunks() (combined inner map)", () => {
		for (let i = 0; i < 3; i++) {
			new SourceMapSource(
				fixtureCode,
				"fixture.js",
				fixtureMap,
				fixtureCode,
				fixtureMap,
			).streamChunks({}, noop, noop, noop);
		}
	});

	bench.add("source-map-source: updateHash()", () => {
		for (let i = 0; i < 10; i++) {
			new SourceMapSource(fixtureCode, "fixture.js", fixtureMap).updateHash(
				createHash("sha256"),
			);
		}
	});
}
