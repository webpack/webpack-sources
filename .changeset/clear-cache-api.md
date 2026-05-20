---
"webpack-sources": minor
---

Add `clearCache(options?, visited?)` method to `Source` that recursively releases cached data (`CachedSource` cached maps/buffers/strings, `SourceMapSource` parsed/serialized map caches, and dual-buffer caches in leaf sources). Lets consumers like webpack's `SourceMapDevToolPlugin` reclaim memory between chunks rather than accumulating per-task source map data across an entire build. Pass `{ mapsOnly: true }` to keep cached source data when only the map caches should be dropped. The optional `visited` `WeakSet` deduplicates the walk when the same child is reachable through multiple parents (e.g. modules shared across chunks).
