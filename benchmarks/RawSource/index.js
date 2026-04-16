/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { RawSource } = require("../../lib");
const { fixtureCode, fixtureBuffer, noop } = require("../_shared/fixtures");
const { createHash } = require("../_shared/hash");

/**
 * @param {import("tinybench").Bench} bench bench
 */
module.exports = (bench) => {
	bench
		.add("RawSource: new RawSource(string)", () => {
			new RawSource(fixtureCode);
		})
		.add("RawSource: new RawSource(buffer)", () => {
			new RawSource(fixtureBuffer);
		})
		.add("RawSource: new RawSource(buffer, true)", () => {
			new RawSource(fixtureBuffer, true);
		})
		.add("RawSource: source() (string)", () => {
			new RawSource(fixtureCode).source();
		})
		.add("RawSource: source() cached", () => {
			const src = new RawSource(fixtureCode);
			src.source();
			src.source();
		})
		.add("RawSource: buffer() (from string)", () => {
			new RawSource(fixtureCode).buffer();
		})
		.add("RawSource: buffer() (from buffer)", () => {
			new RawSource(fixtureBuffer).buffer();
		})
		.add("RawSource: size()", () => {
			new RawSource(fixtureCode).size();
		})
		.add("RawSource: isBuffer()", () => {
			new RawSource(fixtureBuffer).isBuffer();
		})
		.add("RawSource: map()", () => {
			new RawSource(fixtureCode).map({});
		})
		.add("RawSource: sourceAndMap()", () => {
			new RawSource(fixtureCode).sourceAndMap({});
		})
		.add("RawSource: streamChunks()", () => {
			new RawSource(fixtureCode).streamChunks({}, noop, noop, noop);
		})
		.add("RawSource: streamChunks({finalSource:true})", () => {
			new RawSource(fixtureCode).streamChunks(
				{ finalSource: true },
				noop,
				noop,
				noop,
			);
		})
		.add("RawSource: updateHash()", () => {
			new RawSource(fixtureCode).updateHash(createHash());
		});
};
