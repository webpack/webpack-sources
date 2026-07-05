---
"webpack-sources": patch
---

Reduce allocations and CPU in `map()` / `sourceAndMap()`: mappings are serialized into a reused byte buffer instead of per-mapping strings, `ReplaceSource` verifies original content through a line-offset index instead of splitting sources into line arrays, and `ReplaceSource.streamChunks` emits position-only chunks and returns the final source directly when `finalSource` is requested.
