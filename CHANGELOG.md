# webpack-sources

## 3.5.0

### Minor Changes

- Add `clearCache(options?, visited?)` method to `Source` that recursively releases cached data (`CachedSource` cached maps/buffers/strings, `SourceMapSource` parsed/serialized map caches, and dual-buffer caches in leaf sources). Lets consumers like webpack's `SourceMapDevToolPlugin` reclaim memory between chunks rather than accumulating per-task source map data across an entire build. Options: `maps` (default `true`) drops cached source maps; `source` (default `true`) drops cached source/buffer copies — pass `false` to keep source available for downstream plugins; `parsedMap` (default `false`) additionally drops the parsed object form on `SourceMapSource` instances when a buffer or string form survives (the combination `{ maps: true, source: false, parsedMap: true }` matches the `SourceMapDevToolPlugin` call shape in webpack/webpack#20963). The optional `visited` `WeakSet` deduplicates the walk when the same child is reachable through multiple parents (e.g. modules shared across chunks). (by [@alexander-akait](https://github.com/alexander-akait) in [#221](https://github.com/webpack/webpack-sources/pull/221))

## 3.4.1

### Patch Changes

- Implements more effective `buffers` and `buffer` for `ReplaceSource` and improve performance in other places. (by [@alexander-akait](https://github.com/alexander-akait) in [#211](https://github.com/webpack/webpack-sources/pull/211))

## 3.4.0

### Minor Changes

- Add `Source.prototype.buffers()` that returns the source as `Buffer[]`. `ConcatSource`, `CachedSource`, and `CompatSource` implement it without allocating an intermediate concatenated buffer, allowing consumers that can write multiple buffers at once (e.g. via `writev`) to avoid the overhead of `Buffer.concat` in deeply nested sources. (by [@alexander-akait](https://github.com/alexander-akait) in [#204](https://github.com/webpack/webpack-sources/pull/204))

### Patch Changes

- fix: use Int32Array for signed VLQ delta accumulation in `readMappings` so cumulative values that go negative are preserved instead of wrapping to a large unsigned integer (by [@alexander-akait](https://github.com/alexander-akait) in [#206](https://github.com/webpack/webpack-sources/pull/206))

- Improved performance in many places. (by [@alexander-akait](https://github.com/alexander-akait) in [#209](https://github.com/webpack/webpack-sources/pull/209))
