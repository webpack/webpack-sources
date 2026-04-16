/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { OriginalSource } = require("../../lib");
const {
	fixtureCode,
	fixtureBuffer,
	bigSource,
	noop,
} = require("../_shared/fixtures");
const { createHash } = require("../_shared/hash");

/**
 * @param {import("tinybench").Bench} bench bench
 */
module.exports = (bench) => {
	bench
		.add("OriginalSource: new OriginalSource(string)", () => {
			new OriginalSource(fixtureCode, "fixture.js");
		})
		.add("OriginalSource: new OriginalSource(buffer)", () => {
			new OriginalSource(fixtureBuffer, "fixture.js");
		})
		.add("OriginalSource: source()", () => {
			new OriginalSource(fixtureCode, "fixture.js").source();
		})
		.add("OriginalSource: buffer()", () => {
			new OriginalSource(fixtureCode, "fixture.js").buffer();
		})
		.add("OriginalSource: size()", () => {
			new OriginalSource(fixtureCode, "fixture.js").size();
		})
		.add("OriginalSource: getName()", () => {
			new OriginalSource(fixtureCode, "fixture.js").getName();
		})
		.add("OriginalSource: map()", () => {
			new OriginalSource(fixtureCode, "fixture.js").map({});
		})
		.add("OriginalSource: map({columns:false})", () => {
			new OriginalSource(fixtureCode, "fixture.js").map({ columns: false });
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
			new OriginalSource(fixtureCode, "fixture.js").streamChunks(
				{},
				noop,
				noop,
				noop,
			);
		})
		.add("OriginalSource: streamChunks({columns:false})", () => {
			new OriginalSource(fixtureCode, "fixture.js").streamChunks(
				{ columns: false },
				noop,
				noop,
				noop,
			);
		})
		.add("OriginalSource: streamChunks({finalSource:true})", () => {
			new OriginalSource(fixtureCode, "fixture.js").streamChunks(
				{ finalSource: true },
				noop,
				noop,
				noop,
			);
		})
		.add(
			"OriginalSource: streamChunks({finalSource:true,columns:false})",
			() => {
				new OriginalSource(fixtureCode, "fixture.js").streamChunks(
					{ finalSource: true, columns: false },
					noop,
					noop,
					noop,
				);
			},
		)
		.add("OriginalSource: streamChunks() (big source)", () => {
			new OriginalSource(bigSource, "big.js").streamChunks(
				{},
				noop,
				noop,
				noop,
			);
		})
		.add("OriginalSource: updateHash()", () => {
			new OriginalSource(fixtureCode, "fixture.js").updateHash(createHash());
		});
};
