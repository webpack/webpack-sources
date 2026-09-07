/*
 * Public type entry point of `webpack-sources`.
 *
 * The declarations under `types/` are generated from the JSDoc in `lib/` by
 * `npm run build:types`; don't edit them by hand. This file re-exports them in
 * the package's public shape: every class is available as both a value and a
 * type, next to the public helper types.
 *
 * TODO: remove this file in the next major release and point `types` in
 * `package.json` at the generated `types/index.d.ts`. That requires the
 * exports in `lib/index.js` to be typed so the classes are exported as types
 * too (e.g. `Source` usable in `let source: Source`), which is a breaking
 * change for the shape of the public types.
 */

import CachedSource = require("./types/CachedSource");
import CompatSource = require("./types/CompatSource");
import ConcatSource = require("./types/ConcatSource");
import OriginalSource = require("./types/OriginalSource");
import PrefixSource = require("./types/PrefixSource");
import RawSource = require("./types/RawSource");
import ReplaceSource = require("./types/ReplaceSource");
import SizeOnlySource = require("./types/SizeOnlySource");
import Source = require("./types/Source");
import SourceMapSource = require("./types/SourceMapSource");
import GetGeneratedSourceInfo = require("./types/helpers/getGeneratedSourceInfo");
import Scopes = require("./types/helpers/scopes");
import StreamChunks = require("./types/helpers/streamChunks");
import StringBufferUtils = require("./types/helpers/stringBufferUtils");

declare namespace exports {
	export namespace util {
		export import scopes = Scopes;
		export import stringBufferUtils = StringBufferUtils;
	}
	export type OnChunk = StreamChunks.OnChunk;
	export type OnName = StreamChunks.OnName;
	export type OnSource = StreamChunks.OnSource;
	export type CachedData = CachedSource.CachedData;
	export type SourceLike = CompatSource.SourceLike;
	export type ConcatSourceChild = ConcatSource.Child;
	export import Replacement = ReplaceSource.Replacement;
	export type HashLike = Source.HashLike;
	export type MapOptions = Source.MapOptions;
	export type RawSourceMap = Source.RawSourceMap;
	export type SourceAndMap = Source.SourceAndMap;
	export type SourceValue = Source.SourceValue;
	export type GeneratedSourceInfo = GetGeneratedSourceInfo.GeneratedSourceInfo;
	export type StreamChunksOptions = StreamChunks.Options;
	export {
		Source,
		RawSource,
		OriginalSource,
		SourceMapSource,
		CachedSource,
		ConcatSource,
		ReplaceSource,
		PrefixSource,
		SizeOnlySource,
		CompatSource,
	};
}

export = exports;
