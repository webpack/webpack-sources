# webpack-sources

## 3.5.2

### Patch Changes

- perf: hash a string-backed source without materializing its buffer (by [@alexander-akait](https://github.com/alexander-akait) in [#286](https://github.com/webpack/webpack-sources/pull/286))

  `RawSource.updateHash` and `OriginalSource.updateHash` called `buffer()`, which
  encodes the string to UTF-8 and memoizes the result — so every source that was
  hashed kept its content twice, as a string and as a buffer, for as long as the
  source lived. Node hashes a string as UTF-8, the same bytes `buffer()` produces,
  so the string is hashed directly instead and no digest changes.

  Measured on a webpack build of three.js + lodash-es (1033 modules, 2.71 MB of
  module source): retained `arrayBuffers` after the build drop from 8.74–8.76 MB
  to 5.81 MB with `devtool: false`, and from 9.35–12.11 MB to 6.42 MB with
  `devtool: "source-map"` — disjoint over six and five runs. 1029 `Buffer.from`
  calls per build are removed, one per module. CPU is unchanged: hashing those
  sources costs 9.23 ms via the buffer against 8.18 ms via the string, which no
  whole-build timing can resolve.

## 3.5.1

### Patch Changes

- perf: stream potential tokens in OriginalSource instead of materialising an array (by [@alexander-akait](https://github.com/alexander-akait) in [#246](https://github.com/webpack/webpack-sources/pull/246))

  `OriginalSource.streamChunks` (and therefore `map()` / `sourceAndMap()`) previously built the full `splitIntoPotentialTokens` array of substrings and then iterated it — even though `map()` and `sourceAndMap()` run with `finalSource: true` and discard every chunk substring. The scan is now streamed by offset, so chunk substrings are only allocated when actually emitted. This removes the intermediate array and, on the dominant final-source paths, all per-token slices: `map()` / `sourceAndMap()` allocate ~38–46% less memory and run ~15–40% faster.

- Reduce allocations and CPU in `map()` / `sourceAndMap()`: mappings are serialized into a reused byte buffer instead of per-mapping strings, `ReplaceSource` verifies original content through a line-offset index instead of splitting sources into line arrays, and `ReplaceSource.streamChunks` emits position-only chunks and returns the final source directly when `finalSource` is requested. (by [@alexander-akait](https://github.com/alexander-akait) in [#251](https://github.com/webpack/webpack-sources/pull/251))

- Skip sorting ReplaceSource replacements when they were added in order. (by [@alexander-akait](https://github.com/alexander-akait) in [#249](https://github.com/webpack/webpack-sources/pull/249))

- perf: use lookup table in splitIntoPotentialTokens for faster character classification (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#240](https://github.com/webpack/webpack-sources/pull/240))

  Replace multi-comparison chains (4 comparisons in phase 1, 6 in phase 2) with a single Uint8Array bitmask lookup per character. This reduces per-character branching overhead, yielding ~7% improvement on typical source and ~21% on large sources.

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
