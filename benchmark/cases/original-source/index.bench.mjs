/*
 * original-source
 *
 * OriginalSource is the common entry point for files that have no prior
 * source map; its streaming path goes through splitIntoPotentialTokens
 * (for column-aware output) or splitIntoLines (for lines-only).
 */

import { createHash } from "crypto";
import { OriginalSource } from "../../../lib/index.js";
import {
	bigSource,
	fixtureBuffer,
	fixtureCode,
	noop,
} from "../../fixtures.mjs";

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	bench.add("original-source: new OriginalSource(string)", () => {
		for (let i = 0; i < 50; i++) new OriginalSource(fixtureCode, "fixture.js");
	});

	bench.add("original-source: new OriginalSource(buffer)", () => {
		for (let i = 0; i < 50; i++) {
			new OriginalSource(fixtureBuffer, "fixture.js");
		}
	});

	bench.add("original-source: source()", () => {
		for (let i = 0; i < 50; i++) {
			new OriginalSource(fixtureCode, "fixture.js").source();
		}
	});

	bench.add("original-source: buffer()", () => {
		for (let i = 0; i < 50; i++) {
			new OriginalSource(fixtureCode, "fixture.js").buffer();
		}
	});

	bench.add("original-source: size()", () => {
		for (let i = 0; i < 50; i++) {
			new OriginalSource(fixtureCode, "fixture.js").size();
		}
	});

	bench.add("original-source: getName()", () => {
		const src = new OriginalSource(fixtureCode, "fixture.js");
		for (let i = 0; i < 500; i++) src.getName();
	});

	bench.add("original-source: map()", () => {
		for (let i = 0; i < 10; i++) {
			new OriginalSource(fixtureCode, "fixture.js").map({});
		}
	});

	bench.add("original-source: map({columns:false})", () => {
		for (let i = 0; i < 10; i++) {
			new OriginalSource(fixtureCode, "fixture.js").map({ columns: false });
		}
	});

	bench.add("original-source: sourceAndMap()", () => {
		for (let i = 0; i < 10; i++) {
			new OriginalSource(fixtureCode, "fixture.js").sourceAndMap({});
		}
	});

	bench.add("original-source: sourceAndMap({columns:false})", () => {
		for (let i = 0; i < 10; i++) {
			new OriginalSource(fixtureCode, "fixture.js").sourceAndMap({
				columns: false,
			});
		}
	});

	bench.add("original-source: streamChunks()", () => {
		for (let i = 0; i < 10; i++) {
			new OriginalSource(fixtureCode, "fixture.js").streamChunks(
				{},
				noop,
				noop,
				noop,
			);
		}
	});

	bench.add("original-source: streamChunks({columns:false})", () => {
		for (let i = 0; i < 10; i++) {
			new OriginalSource(fixtureCode, "fixture.js").streamChunks(
				{ columns: false },
				noop,
				noop,
				noop,
			);
		}
	});

	bench.add("original-source: streamChunks({finalSource:true})", () => {
		for (let i = 0; i < 10; i++) {
			new OriginalSource(fixtureCode, "fixture.js").streamChunks(
				{ finalSource: true },
				noop,
				noop,
				noop,
			);
		}
	});

	bench.add(
		"original-source: streamChunks({finalSource:true,columns:false})",
		() => {
			for (let i = 0; i < 10; i++) {
				new OriginalSource(fixtureCode, "fixture.js").streamChunks(
					{ finalSource: true, columns: false },
					noop,
					noop,
					noop,
				);
			}
		},
	);

	bench.add("original-source: streamChunks() (big source)", () => {
		new OriginalSource(bigSource, "big.js").streamChunks({}, noop, noop, noop);
	});

	bench.add("original-source: updateHash()", () => {
		for (let i = 0; i < 20; i++) {
			new OriginalSource(fixtureCode, "fixture.js").updateHash(
				createHash("sha256"),
			);
		}
	});
}
