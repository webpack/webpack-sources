jest.mock("../lib/helpers/createMappingsSerializer");
const { SourceMapConsumer } = require("source-map");
const CachedSource = require("../lib/CachedSource");
const CompatSource = require("../lib/CompatSource");
const ConcatSource = require("../lib/ConcatSource");
const OriginalSource = require("../lib/OriginalSource");
const PrefixSource = require("../lib/PrefixSource");
const RawSource = require("../lib/RawSource");
const ReplaceSource = require("../lib/ReplaceSource");
const SourceMapSource = require("../lib/SourceMapSource");
const { withReadableMappings } = require("./helpers");
const validate = require("sourcemap-validator");

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
			match[0].replace(/\n[^]*$/, "").trim()
		);
		match = regexp.exec(input);
	}
};

const getReplacementNames = input => {
	return input.match(/\w{6,}/g);
};

describe("Fuzzy", () => {
	const variants = {
		CompatSource: source => new CompatSource(source),
		PrefixSource: source => new PrefixSource("lorem: ", source),
		ReplaceSource: source => {
			const replaceSource = new ReplaceSource(source, "replaced.txt");
			const input = source.source();
			makeReplacements(replaceSource, input);
			return replaceSource;
		},
		ConcatSource: source => new ConcatSource(source, source, source),
		SourceMapSource: source => {
			const map = source.map();
			return map
				? new SourceMapSource(source.source(), "source-map.txt", source.map())
				: new OriginalSource(source.source(), "lorem.txt");
		},
		SourceMapSourceInner: source => {
			const code = source.source();
			const replaceSource = new ReplaceSource(
				new OriginalSource(code, "lorem.txt"),
				"replaced.txt"
			);
			const input = source.source();
			makeReplacements(replaceSource, input);
			const sourceAndMap = replaceSource.sourceAndMap();

			const map = source.map();
			return map
				? new SourceMapSource(
						sourceAndMap.source,
						"lorem.txt",
						sourceAndMap.map,
						code,
						map,
						true
				  )
				: new SourceMapSource(
						sourceAndMap.source,
						"lorem.txt",
						sourceAndMap.map
				  );
		},
		CachedSource: source => new CachedSource(source)
	};

	const createTests = (remaining, snapshot, list, offset) => {
		if (remaining === 0) {
			for (const [inputName, input] of [
				["lorem", LOREM],
				["lorem lines", LOREM_LINES]
			]) {
				const validNames = getReplacementNames(input);
				const validateSourceMap = async (sourceMap, code) => {
					try {
						expect(sourceMap.mappings).toMatch(
							/^[A-Za-z0-9+/]{1,10}((,|;+)[A-Za-z0-9+/]{1,10})*$/
						);
						expect(sourceMap.sources).toContain("lorem.txt");
						for (const name of sourceMap.names) {
							expect(validNames).toContain(name);
						}
						validate(code, JSON.stringify(sourceMap));
						await SourceMapConsumer.with(sourceMap, null, consumer => {
							if (offset === 0) {
								// TODO test for other offset too
								expect(
									consumer.originalPositionFor({ line: 1, column: 0 })
								).toEqual({
									source: "lorem.txt",
									line: 1,
									column: 0,
									name: null
								});
							}
						});
					} catch (e) {
						e.message += `\n${JSON.stringify(sourceMap, 0, 2)}\n${
							withReadableMappings(sourceMap, code)._mappings
						}`;
						throw e;
					}
				};
				const rawSourceFn = list.reduceRight(
					(result, fn) => () => fn(result()),
					() => new RawSource(input)
				);
				const originalSourceFn = list.reduceRight(
					(result, fn) => () => fn(result()),
					() => new OriginalSource(input, "lorem.txt")
				);
				for (const options of [undefined, { columns: false }]) {
					const o = JSON.stringify(options);
					for (const [inputSourceName, sourceFn] of [
						["raw", rawSourceFn],
						["original", originalSourceFn]
					]) {
						if (options === undefined) {
							it(`${inputSourceName} ${inputName} should return correct .source()`, () => {
								const source = sourceFn();
								const result = source.source();
								expect(source.source()).toEqual(result);
								if (snapshot) {
									expect(result).toMatchSnapshot();
								}
							});
							it(`${inputSourceName} ${inputName} should return correct .size()`, () => {
								const source = sourceFn();
								const result = source.size();
								expect(source.size()).toEqual(result);
								if (snapshot) {
									expect(result).toMatchSnapshot();
								}
							});
						}
						it(`${inputSourceName} ${inputName} should return correct .map(${o})`, async () => {
							const source = sourceFn();
							const result = withReadableMappings(source.map(options));
							expect(withReadableMappings(source.map(options))).toEqual(result);
							if (inputSourceName === "original") {
								expect(result).toBeTruthy();
							}
							if (result) {
								const code = source.source();
								await validateSourceMap(result, code);
							}
							if (snapshot) {
								expect(result).toMatchSnapshot();
							}
						});
						it(`${inputSourceName} ${inputName} should return correct .sourceAndMap(${o})`, async () => {
							const source = sourceFn();
							const result = source.sourceAndMap(options);
							result.map = withReadableMappings(result.map);
							if (result.map) {
								expect(result.map.mappings).toMatch(
									/^[A-Za-z0-9+/]{1,10}((,|;+)[A-Za-z0-9+/]{1,10})*$/
								);
								await validateSourceMap(result.map, result.source);
							}
							const result2 = source.sourceAndMap(options);
							result2.map = withReadableMappings(result.map);
							expect(result).toEqual(result2);
							expect(result.map).toEqual(
								withReadableMappings(sourceFn().map(options))
							);
							if (snapshot) {
								expect(result).toMatchSnapshot();
							}
						});
					}
					it(`${inputName} RawSource and OriginalSource should return equal .source(${o})`, () => {
						expect(originalSourceFn().source()).toEqual(rawSourceFn().source());
					});
					it(`${inputName} RawSource and OriginalSource should return equal .sourceAndMap(${o}).source`, () => {
						expect(originalSourceFn().sourceAndMap(options).source).toEqual(
							rawSourceFn().sourceAndMap(options).source
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
						list.concat(fn),
						offset + (key === "PrefixSource" ? 7 : 0)
					);
				});
			}
		}
	};
	describe("single source", () => createTests(1, true, [], 0));
	describe("2 sources", () => createTests(2, true, [], 0));
	describe("3 sources", () => createTests(3, false, [], 0));
	describe("4 sources", () => createTests(4, false, [], 0));
});
