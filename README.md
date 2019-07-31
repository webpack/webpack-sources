# webpack-sources

Contains multiple classes which represent a `Source`. A `Source` can be asked for source code, size, source map and hash.

## `Source`

Base class for all sources.

### Public methods

All methods should be considered as expensive as they may need to do computations.

#### `source`

```js
Source.prototype.source() -> String | Buffer
```

Returns the represented source code as string or Buffer (for binary Sources).

#### `buffer`

```js
Source.prototype.buffer() -> Buffer
```

Returns the represented source code as Buffer. Strings are converted to utf-8.

#### `size`

```js
Source.prototype.size() -> Number
```

Returns the size in bytes of the represented source code.

#### `map`

```js
Source.prototype.map(options?: Object) -> Object | null
```

Returns the SourceMap of the represented source code as JSON. May return `null` if no SourceMap is available.

The `options` object can contain the following keys:

- `columns: Boolean` (default `true`): If set to false the implementation may omit mappings for columns.
- `module: Boolean` (default `true`): If set to false the implementation may omit inner mappings for modules.

#### `sourceAndMap`

```js
Source.prototype.sourceAndMap(options?: Object) -> {
	source: String | Buffer,
	map: Object
}
```

Returns both, source code (like `Source.prototype.source()` and SourceMap (like `Source.prototype.map()`). This method could have better performance than calling `source()` and `map()` separately.

See `map()` for `options`.

#### `updateHash`

```js
Source.prototype.updateHash(hash: Hash) -> void
```

Updates the provided `Hash` object with the content of the represented source code. (`Hash` is an object with an `update` method, which is called with string values)

## `RawSource`

Represents source code without SourceMap.

```js
new RawSource(sourceCode: String)
```

## `OriginalSource`

Represents source code, which is a copy of the original file.

```js
new OriginalSource(
	sourceCode: String,
	name: String
)
```

- `sourceCode`: The source code.
- `name`: The filename of the original source code.

OriginalSource tries to create column mappings if requested, by splitting the source code at typical statement borders (`;`, `{`, `}`).

## `SourceMapSource`

Represents source code with SourceMap, optionally having an additional SourceMap for the original source.

```js
new SourceMapSource(
	sourceCode: String,
	name: String,
	sourceMap: Object | String,
	originalSource?: String,
	innerSourceMap?: Object | String,
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

```js
new CachedSource(source: Source)
```

## `PrefixSource`

Prefix every line of the decorated `Source` with a provided string.

```js
new PrefixSource(
	prefix: String,
	source: Source
)
```

## `ConcatSource`

Concatenate multiple `Source`s or strings to a single source.

```js
new ConcatSource(
	...items?: Source | String
)
```

### Public methods

#### `add`

```js
ConcatSource.prototype.add(item: Source | String)
```

Adds an item to the source.

## `ReplaceSource`

Decorates a `Source` with replacements and insertions of source code.

The `ReplaceSource` supports "identity" mappings for child source.
When original source matches generated source for a mapping it's assumed to be mapped char by char allowing to split mappings at replacements/insertions.

### Public methods

#### `replace`

```js
ReplaceSource.prototype.replace(
	start: Number,
	end: Number,
	replacement: String
)
```

Replaces chars from `start` (0-indexed, inclusive) to `end` (0-indexed, inclusive) with `replacement`.

Locations represents locations in the original source and are not influenced by other replacements or insertions.

#### `insert`

```js
ReplaceSource.prototype.insert(
	pos: Number,
	insertion: String
)
```

Inserts the `insertion` before char `pos` (0-indexed).

Location represents location in the original source and is not influenced by other replacements or insertions.

#### `original`

Get decorated `Source`.
