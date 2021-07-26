const CachedSource = require("../lib/CachedSource");
const CompatSource = require("../lib/CompatSource");
const ConcatSource = require("../lib/ConcatSource");
const OriginalSource = require("../lib/OriginalSource");
const PrefixSource = require("../lib/PrefixSource");
const RawSource = require("../lib/RawSource");
const ReplaceSource = require("../lib/ReplaceSource");
const SourceMapSource = require("../lib/SourceMapSource");
const { withReadableMappings } = require("./helpers");

const LOREM =
	"Lorem { ipsum dolor sit; } amet; { consetetur sadipscing elitr }; { sed { diam; nonumy; } eirmod { tempor invidunt ut labore et } dolore magna aliquyam erat; {{{ sed } diam } voluptua}; At vero eos et accusam et justo duo dolores et ea rebum; Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. { Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore } et dolore magna aliquyam erat, { sed diam voluptua }. { At } { vero } { eos } { et } accusam { et } justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.";

const LOREM_LINES = LOREM.replace(/(.{20,}?)\s/g, "$1\n");

describe("Snapshots", () => {
	const variants = {
		CompatSource: source => new CompatSource(source),
		PrefixSource: source => new PrefixSource("lorem: ", source),
		ReplaceSource: source => {
			const replaceSource = new ReplaceSource(source, "replaced.txt");
			const input = source.source();
			const regexp = /\w{6,}(\n\w{6,})?/g;
			let match = regexp.exec(input);
			while (match !== null) {
				replaceSource.replace(
					match.index,
					match.index + match[0].length - 1,
					match[0].length % 4 === 0 ? "XXX\n" : "XXX",
					match[0].trim()
				);
				match = regexp.exec(input);
			}
			return replaceSource;
		},
		ConcatSource: source => new ConcatSource(source, source, source),
		SourceMapSource: source => {
			const map = source.map();
			return map
				? new SourceMapSource(source.source(), "source-map.txt", source.map())
				: new OriginalSource(source.source(), "origina.txt");
		},
		CachedSource: source => new CachedSource(source)
	};
	const variantsCount = Object.keys(variants).length;

	const createTests = (keys, current) => {
		for (const key of keys) {
			const remainingKeys = keys.filter(k => k !== key);
			// if (remainingKeys.length > 3) createTests(remainingKeys, current);
			const withVariant = {};
			const fn = variants[key];
			for (const k of Object.keys(current)) {
				const sourceFn = current[k];
				withVariant[k] = () => fn(sourceFn());
			}
			describe(key, () => {
				createTests(remainingKeys, withVariant);
			});
		}
		if (keys.length === variantsCount - 3) {
			for (const key of Object.keys(current)) {
				const sourceFn = current[key];
				it(`${key} should return correct .source()`, () => {
					expect(sourceFn().source()).toMatchSnapshot();
				});
				it(`${key} should return correct .size()`, () => {
					expect(sourceFn().size()).toMatchSnapshot();
				});
				it(`${key} should return correct .map()`, () => {
					expect(withReadableMappings(sourceFn().map())).toMatchSnapshot();
				});
				it(`${key} should return correct .map({ columns: false })`, () => {
					expect(
						withReadableMappings(sourceFn().map({ columns: false }))
					).toMatchSnapshot();
				});
				it(`${key} should return correct .sourceAndMap()`, () => {
					const result = sourceFn().sourceAndMap();
					result.map = withReadableMappings(result.map);
					expect(result).toMatchSnapshot();
				});
				it(`${key} should return correct .sourceAndMap({ columns: false })`, () => {
					const result = sourceFn().sourceAndMap({ columns: false });
					result.map = withReadableMappings(result.map);
					expect(result).toMatchSnapshot();
				});
			}
		}
	};
	createTests(Object.keys(variants), {
		raw: () => new RawSource(LOREM),
		"raw lines": () => new RawSource(LOREM_LINES),
		original: () => new OriginalSource(LOREM, "lorem.txt"),
		"original lines": () => new OriginalSource(LOREM_LINES, "lorem.txt")
	});
});
