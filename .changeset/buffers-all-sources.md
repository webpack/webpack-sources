---
"webpack-sources": patch
---

Add explicit `buffers()` implementations to `RawSource`, `OriginalSource`, `PrefixSource`, `ReplaceSource`, and `SourceMapSource`. `ReplaceSource` delegates to the underlying source's `buffers()` when no replacements are queued.
