# webpack-sources

Contains multiple classes which represent a `Source`. A `Source` can be asked for source code, size, source map and hash.

## `Source`

Base class for all sources.

### Public methods

All methods should be considered as expensive as they may need to do computations.

#### `source`

<!-- eslint-skip -->
```typescript
Source.prototype.source() -> String | Buffer
```

Returns the represented source code as string or Buffer (for binary Sources).

#### `buffer`

<!-- eslint-skip -->
```typescript
Source.prototype.buffer() -> Buffer
```

Returns the represented source code as Buffer. Strings are converted to utf-8.

#### `buffers`

<!-- eslint-skip -->
```typescript
Source.prototype.buffers() -> Buffer[]
```

Returns the represented source code as an array of Buffers. This avoids the
intermediate `Buffer.concat` allocation performed by `buffer()` when the source
is composed of multiple children (for example `ConcatSource`). Consumers that
can accept an array of buffers (e.g. writing via `fs.createWriteStream` or
`writev`) should prefer this method for better performance.

The default implementation returns `[this.buffer()]`.

#### `size`

<!-- eslint-skip -->
```typescript
Source.prototype.size() -> Number
```

Returns the size in bytes of the represented source code.

#### `map`

<!-- eslint-skip -->
```typescript
Source.prototype.map(options?: Object) -> Object | null
```

Returns the SourceMap of the represented source code as JSON. May return `null` if no SourceMap is available.

The `options` object can contain the following keys:

- `columns: Boolean` (default `true`): If set to false the implementation may omit mappings for columns.

#### `sourceAndMap`

<!-- eslint-skip -->
```typescript
Source.prototype.sourceAndMap(options?: Object) -> {
	source: String | Buffer,
	map: Object | null
}
```

Returns both, source code (like `Source.prototype.source()` and SourceMap (like `Source.prototype.map()`). This method could have better performance than calling `source()` and `map()` separately.

See `map()` for `options`.

#### `updateHash`

<!-- eslint-skip -->
```typescript
Source.prototype.updateHash(hash: Hash) -> void
```

Updates the provided `Hash` object with the content of the represented source code. (`Hash` is an object with an `update` method, which is called with string values)

## `RawSource`

Represents source code without SourceMap.

<!-- eslint-skip -->
```typescript
new RawSource(sourceCode: String | Buffer)
```

## `OriginalSource`

Represents source code, which is a copy of the original file.

<!-- eslint-skip -->
```typescript
new OriginalSource(
	sourceCode: String | Buffer,
	name: String
)
```

- `sourceCode`: The source code.
- `name`: The filename of the original source code.

OriginalSource tries to create column mappings if requested, by splitting the source code at typical statement borders (`;`, `{`, `}`).

## `SourceMapSource`

Represents source code with SourceMap, optionally having an additional SourceMap for the original source.

<!-- eslint-skip -->
```typescript
new SourceMapSource(
	sourceCode: String | Buffer,
	name: String,
	sourceMap: Object | String | Buffer,
	originalSource?: String | Buffer,
	innerSourceMap?: Object | String | Buffer,
	removeOriginalSource?: boolean
)
```

- `sourceCode`: The source code.
- `name`: The filename of the original source code.
- `sourceMap`: The SourceMap for the source code.
- `originalSource`: The source code of the original file. Can be omitted if the `sourceMap` already contains the original source code.
- `innerSourceMap`: The SourceMap for the `originalSource`/`name`.
- `removeOriginalSource`: Removes the source code for `name` from the final map, keeping only the deeper mappings for that file.

The `SourceMapSource` supports "identity" mappings for the `innerSourceMap`.
When original source matches generated source for a mapping it's assumed to be mapped char by char allowing to keep finer mappings from `sourceMap`.

## `CachedSource`

Decorates a `Source` and caches returned results of `map`, `source`, `buffer`, `size` and `sourceAndMap` in memory. `updateHash` is not cached.
It tries to reused cached results from other methods to avoid calculations, i. e. when `source` is already cached, calling `size` will get the size from the cached source, calling `sourceAndMap` will only call `map` on the wrapped Source.

<!-- eslint-skip -->
```typescript
new CachedSource(source: Source)
new CachedSource(source: Source | () => Source, cachedData?: CachedData)
```

Instead of passing a `Source` object directly one can pass an function that returns a `Source` object. The function is only called when needed and once.

### Public methods

#### `getCachedData()`

Returns the cached data for passing to the constructor. All cached entries are converted to Buffers and strings are avoided.

#### `original()`

Returns the original `Source` object.

#### `originalLazy()`

Returns the original `Source` object or a function returning these.

## `PrefixSource`

Prefix every line of the decorated `Source` with a provided string.

<!-- eslint-skip -->
```typescript
new PrefixSource(
	prefix: String,
	source: Source | String | Buffer
)
```

## `ConcatSource`

Concatenate multiple `Source`s or strings to a single source.

<!-- eslint-skip -->
```typescript
new ConcatSource(
	...items?: Source | String
)
```

### Public methods

#### `add`

<!-- eslint-skip -->
```typescript
ConcatSource.prototype.add(item: Source | String)
```

Adds an item to the source.

## `ReplaceSource`

Decorates a `Source` with replacements and insertions of source code.

The `ReplaceSource` supports "identity" mappings for child source.
When original source matches generated source for a mapping it's assumed to be mapped char by char allowing to split mappings at replacements/insertions.

### Public methods

#### `replace`

<!-- eslint-skip -->
```typescript
ReplaceSource.prototype.replace(
	start: Number,
	end: Number,
	replacement: String
)
```

Replaces chars from `start` (0-indexed, inclusive) to `end` (0-indexed, inclusive) with `replacement`.

Locations represents locations in the original source and are not influenced by other replacements or insertions.

#### `insert`

<!-- eslint-skip -->
```typescript
ReplaceSource.prototype.insert(
	pos: Number,
	insertion: String
)
```

Inserts the `insertion` before char `pos` (0-indexed).

Location represents location in the original source and is not influenced by other replacements or insertions.

#### `original`

Get decorated `Source`.

## `CompatSource`

Converts a Source-like object into a real Source object.

### Public methods

#### static `from`

<!-- eslint-skip -->
```typescript
CompatSource.from(sourceLike: any | Source)
```

If `sourceLike` is a real Source it returns it unmodified. Otherwise it returns it wrapped in a CompatSource.

## Source Map Scopes Proposal (experimental)

> **⚠️ Experimental.** `webpack-sources` has initial support for the
> [TC39 Source Map Scopes Proposal](https://github.com/tc39/source-map/blob/main/proposals/scopes.md)
> (`originalScopes` / `generatedRanges`). The proposal is still evolving, so
> the **wire format, flag bits, callback shape, and helper names may change**
> in future minor releases. Do not depend on this as part of a stable API
> surface yet.

When a `SourceMapSource` is constructed with an input source map that carries
`originalScopes` and/or `generatedRanges`, those fields are forwarded through
the `streamChunks` pipeline and back out on the map produced by `.map()` /
`.sourceAndMap()`:

<!-- eslint-skip -->
```typescript
const map = {
	version: 3,
	sources: ["a.js"],
	names: [],
	mappings: "AAAA;AACA;",
	// Experimental Scopes Proposal fields:
	originalScopes: ["…"], // one VLQ string per source
	generatedRanges: "…",  // one VLQ string for the generated file
};
const src = new SourceMapSource(generatedCode, "a.js", map);
const out = src.map(); // out.originalScopes / out.generatedRanges preserved
```

The scope data is propagated through derived sources as follows:

- **`SourceMapSource`** — reads scopes/ranges from the input source map and
  emits them.
- **`ConcatSource`** — forwards original scopes verbatim and shifts each
  child's generated-range line/column by the cumulative offset.
- **`PrefixSource`** — shifts generated-range columns by the prefix length
  on non-line-start positions.
- **`CachedSource`** — passes the callbacks through both the cache-miss and
  cache-hit paths.
- **`ReplaceSource`** — forwards original scopes (positions refer to
  original sources and are stable across replacements). Generated ranges
  are dropped because their generated columns would need remapping through
  each replacement.
- **`RawSource` / `OriginalSource`** — accept the callbacks as no-ops
  (these sources have no scope data of their own).
- **Combined source maps** (`SourceMapSource` with an inner map) — accept
  the callbacks but drop the scope/range data. Remapping scopes/ranges
  through the combined coordinate transform is not implemented yet.

### `streamChunks` callbacks

`Source.prototype.streamChunks` has two **optional** trailing parameters for
Scopes Proposal data. Passing them is the only way to receive scope/range
events; omitting them is fully backwards compatible.

<!-- eslint-skip -->
```typescript
source.streamChunks(
	options,
	onChunk,
	onSource,
	onName,
	// Experimental. `flags >= 0` is a scope start; `flags === -1` is a
	// scope end.
	onOriginalScope?: (
		sourceIndex: number,
		line: number,
		column: number,
		flags: number,
		kind: number,
		name: number,
		variables: number[],
	) => void,
	// Experimental. `flags >= 0` is a range start; `flags === -1` is a
	// range end. `definition` / `callsite` tuples are reused internally —
	// copy them if you need to retain data across invocations.
	onGeneratedRange?: (
		generatedLine: number,
		generatedColumn: number,
		flags: number,
		definition?: [sourceIndex: number, scopeIndex: number],
		callsite?: [sourceIndex: number, line: number, column: number],
		bindings?: number[][],
	) => void,
);
```

### Low-level helpers

If you need to decode or encode scope payloads directly, `lib/helpers/scopes`
exposes:

- `readOriginalScopes(sourceIndex, str, onOriginalScope)`
- `readAllOriginalScopes(arr, onOriginalScope)`
- `readGeneratedRanges(str, onGeneratedRange)`
- `createOriginalScopesSerializer()` → serializer for one source's
  `originalScopes` string
- `createGeneratedRangesSerializer()` → serializer for the
  `generatedRanges` string
- Flag constants: `HAS_NAME_FLAG`, `HAS_DEFINITION_FLAG`,
  `HAS_CALLSITE_FLAG`

These are considered **internal / experimental** — their import path
(`webpack-sources/lib/helpers/scopes`) is not part of the stable package
surface and may move.
