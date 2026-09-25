"use strict";

const assert = require("assert");
const { describe, it } = require("node:test");
const { SourceMapConsumer } = require("source-map");
const validate = require("sourcemap-validator");
const CachedSource = require("../lib/CachedSource");
const CompatSource = require("../lib/CompatSource");
const ConcatSource = require("../lib/ConcatSource");
const OriginalSource = require("../lib/OriginalSource");
const PrefixSource = require("../lib/PrefixSource");
const RawSource = require("../lib/RawSource");
const ReplaceSource = require("../lib/ReplaceSource");
const SourceMapSource = require("../lib/SourceMapSource");
const { withReadableMappings } = require("./helpers");

/** @typedef {import("../lib/Source").RawSourceMap} RawSourceMap */

const LOREM =
	"Lorem { ipsum dolor sit; } amet; { consetetur sadipscing elitr }; { sed { diam; nonumy; } eirmod { tempor invidunt ut labore et } dolore magna aliquyam erat; {{{ sed } diam } voluptua}; At vero eos et accusam et justo duo dolores et ea rebum; Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. { Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore } et dolore magna aliquyam erat, { sed diam voluptua }. { At } { vero } { eos } { et } accusam { et } justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.";

const LOREM_LINES = LOREM.replace(/(.{20,}?)\s/g, "$1\n");

const makeReplacements = (replaceSource, input) => {
	const regexp = /\w{6,}(\n\w{6,})?/g;
	let match = regexp.exec(input);
	while (match !== null) {
		replaceSource.replace(
			match.index,
			match.index + match[0].length - 1,
			match[0].length % 4 === 0 ? "XXX\n" : "XXX",
			match[0].replace(/\n[^]*$/, "").trim(),
		);
		match = regexp.exec(input);
	}
};

const getReplacementNames = (input) => input.match(/\w{6,}/g);

describe("fuzzy", () => {
	const variants = {
		CompatSource: (source) => new CompatSource(source),
		PrefixSource: (source) => new PrefixSource("lorem: ", source),
		ReplaceSource: (source) => {
			const replaceSource = new ReplaceSource(source, "replaced.txt");
			const input = source.source();
			makeReplacements(replaceSource, input);
			return replaceSource;
		},
		ConcatSource: (source) => new ConcatSource(source, source, source),
		SourceMapSource: (source) => {
			const map = source.map();
			return map
				? new SourceMapSource(source.source(), "source-map.txt", source.map())
				: new OriginalSource(source.source(), "lorem.txt");
		},
		SourceMapSourceInner: (source) => {
			const code = source.source();
			const replaceSource = new ReplaceSource(
				new OriginalSource(code, "lorem.txt"),
				"replaced.txt",
			);
			const input = source.source();
			makeReplacements(replaceSource, input);
			const sourceAndMap = replaceSource.sourceAndMap();

			const map = source.map();
			return map
				? new SourceMapSource(
						sourceAndMap.source,
						"lorem.txt",
						/** @type {RawSourceMap} */
						(sourceAndMap.map),
						code,
						map,
						true,
					)
				: new SourceMapSource(
						sourceAndMap.source,
						"lorem.txt",
						/** @type {RawSourceMap} */
						(sourceAndMap.map),
					);
		},
		CachedSource: (source) => new CachedSource(source),
	};

	const createTests = (remaining, snapshot, list, offset) => {
		if (remaining === 0) {
			for (const [inputName, input] of [
				["lorem", LOREM],
				["lorem lines", LOREM_LINES],
			]) {
				const validNames = getReplacementNames(input);
				const validateSourceMap = async (sourceMap, code) => {
					try {
						assert.ok(
							/^[A-Za-z0-9+/]{1,10}((,|;+)[A-Za-z0-9+/]{1,10})*$/.test(
								sourceMap.mappings,
							),
						);
						assert.ok(sourceMap.sources.includes("lorem.txt"));
						for (const name of sourceMap.names) {
							assert.ok(validNames.includes(name));
						}
						validate(code, JSON.stringify(sourceMap));
						await SourceMapConsumer.with(sourceMap, null, (consumer) => {
							if (offset === 0) {
								// TODO test for other offset too
								assert.deepStrictEqual(
									consumer.originalPositionFor({ line: 1, column: 0 }),
									{
										source: "lorem.txt",
										line: 1,
										column: 0,
										name: null,
									},
								);
							}
						});
					} catch (err) {
						err.message += `\n${JSON.stringify(sourceMap, undefined, 2)}\n${
							withReadableMappings(sourceMap, code)._mappings
						}`;
						throw err;
					}
				};
				const rawSourceFn = list.reduceRight(
					(result, fn) => () => fn(result()),
					() => new RawSource(input),
				);
				const originalSourceFn = list.reduceRight(
					(result, fn) => () => fn(result()),
					() => new OriginalSource(input, "lorem.txt"),
				);
				for (const options of [undefined, { columns: false }]) {
					const o = JSON.stringify(options);
					for (const [inputSourceName, sourceFn] of [
						["raw", rawSourceFn],
						["original", originalSourceFn],
					]) {
						if (options === undefined) {
							it(`${inputSourceName} ${inputName} should return correct .source()`, (t) => {
								const source = sourceFn();
								const result = source.source();
								assert.deepStrictEqual(source.source(), result);
								if (snapshot) {
									t.assert.snapshot(result);
								}
							});

							it(`${inputSourceName} ${inputName} should return correct .size()`, (t) => {
								const source = sourceFn();
								const result = source.size();
								assert.deepStrictEqual(source.size(), result);
								if (snapshot) {
									t.assert.snapshot(result);
								}
							});
						}

						it(`${inputSourceName} ${inputName} should return correct .map(${o})`, async (t) => {
							const source = sourceFn();
							const result = withReadableMappings(source.map(options));
							assert.deepStrictEqual(
								withReadableMappings(source.map(options)),
								result,
							);
							if (inputSourceName === "original") {
								assert.ok(result);
							}
							if (result) {
								const code = source.source();
								await validateSourceMap(result, code);
							}
							if (snapshot) {
								t.assert.snapshot(result);
							}
						});

						it(`${inputSourceName} ${inputName} should return correct .sourceAndMap(${o})`, async (t) => {
							const source = sourceFn();
							const result = source.sourceAndMap(options);
							result.map = withReadableMappings(result.map);
							if (result.map) {
								assert.ok(
									/^[A-Za-z0-9+/]{1,10}((,|;+)[A-Za-z0-9+/]{1,10})*$/.test(
										result.map.mappings,
									),
								);
								await validateSourceMap(result.map, result.source);
							}
							const result2 = source.sourceAndMap(options);
							result2.map = withReadableMappings(result.map);
							assert.deepStrictEqual(result, result2);
							assert.deepStrictEqual(
								result.map,
								withReadableMappings(sourceFn().map(options)),
							);
							if (snapshot) {
								t.assert.snapshot(result);
							}
						});
					}

					it(`${inputName} RawSource and OriginalSource should return equal .source(${o})`, () => {
						assert.deepStrictEqual(
							originalSourceFn().source(),
							rawSourceFn().source(),
						);
					});

					it(`${inputName} RawSource and OriginalSource should return equal .sourceAndMap(${o}).source`, () => {
						assert.deepStrictEqual(
							originalSourceFn().sourceAndMap(options).source,
							rawSourceFn().sourceAndMap(options).source,
						);
					});
				}
			}
		} else {
			for (const key of Object.keys(variants)) {
				const fn = variants[key];

				describe(key, () => {
					createTests(
						remaining - 1,
						snapshot,
						[...list, fn],
						offset + (key === "PrefixSource" ? 7 : 0),
					);
				});
			}
		}
	};

	describe("single source", () => {
		createTests(1, true, [], 0);
	});

	describe("2 sources", () => {
		createTests(2, true, [], 0);
	});

	describe("3 sources", () => {
		createTests(3, false, [], 0);
	});

	describe("4 sources", () => {
		createTests(4, false, [], 0);
	});
});
