/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const {
	ConcatSource,
	OriginalSource,
	RawSource,
	SourceMapSource,
} = require("../../lib");
const { fixtureCode, fixtureMap, noop } = require("../_shared/fixtures");
const { createHash } = require("../_shared/hash");

/**
 * @returns {ConcatSource} a mixed 4-child ConcatSource
 */
const buildMixed = () =>
	new ConcatSource(
		new RawSource("// header\n"),
		new OriginalSource(fixtureCode, "a.js"),
		"\n// middle\n",
		new OriginalSource(fixtureCode, "b.js"),
	);

/**
 * @param {import("tinybench").Bench} bench bench
 */
module.exports = (bench) => {
	bench
		.add("ConcatSource: new ConcatSource() (10 raw)", () => {
			const parts = [];
			for (let i = 0; i < 10; i++) parts.push(new RawSource(fixtureCode));
			new ConcatSource(...parts);
		})
		.add("ConcatSource: new ConcatSource() (strings)", () => {
			new ConcatSource("a", "b", "c", "d", "e", "f");
		})
		.add("ConcatSource: add() x50", () => {
			const cs = new ConcatSource();
			for (let i = 0; i < 50; i++) cs.add(new RawSource(fixtureCode));
		})
		.add("ConcatSource: addAllSkipOptimizing()", () => {
			const cs = new ConcatSource();
			const parts = [];
			for (let i = 0; i < 50; i++) parts.push(new RawSource(fixtureCode));
			cs.addAllSkipOptimizing(parts);
		})
		.add("ConcatSource: source() (10 raw)", () => {
			const parts = [];
			for (let i = 0; i < 10; i++) parts.push(new RawSource(fixtureCode));
			new ConcatSource(...parts).source();
		})
		.add("ConcatSource: source() (mixed)", () => {
			buildMixed().source();
		})
		.add("ConcatSource: buffer() (10 raw)", () => {
			const parts = [];
			for (let i = 0; i < 10; i++) parts.push(new RawSource(fixtureCode));
			new ConcatSource(...parts).buffer();
		})
		.add("ConcatSource: size()", () => {
			buildMixed().size();
		})
		.add("ConcatSource: getChildren()", () => {
			buildMixed().getChildren();
		})
		.add("ConcatSource: map()", () => {
			buildMixed().map({});
		})
		.add("ConcatSource: sourceAndMap()", () => {
			buildMixed().sourceAndMap({});
		})
		.add("ConcatSource: streamChunks() (mixed)", () => {
			buildMixed().streamChunks({}, noop, noop, noop);
		})
		.add("ConcatSource: streamChunks({finalSource:true})", () => {
			buildMixed().streamChunks(
				{ finalSource: true },
				noop,
				noop,
				noop,
			);
		})
		.add("ConcatSource: streamChunks() with SourceMapSource child", () => {
			const cs = new ConcatSource(
				new SourceMapSource(fixtureCode, "fixture.js", fixtureMap),
				new RawSource("// trailer\n"),
			);
			cs.streamChunks({}, noop, noop, noop);
		})
		.add("ConcatSource: nested flattening", () => {
			const inner = new ConcatSource(
				new RawSource("a"),
				new RawSource("b"),
				new RawSource("c"),
			);
			new ConcatSource(inner, new RawSource("d"), inner).source();
		})
		.add("ConcatSource: updateHash()", () => {
			buildMixed().updateHash(createHash());
		});
};
