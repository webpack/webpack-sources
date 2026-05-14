---
"webpack-sources": minor
---

Add `clearCache()` method to `Source` that recursively releases cached data (`CachedSource` cached maps/buffers/strings and dual-buffer caches in leaf sources). Lets consumers like webpack's `SourceMapDevToolPlugin` reclaim memory between chunks rather than accumulating per-task source map data across an entire build.
