---
"webpack-sources": patch
---

perf: track sorted state incrementally in ReplaceSource replace/insert

Instead of unconditionally marking the array as unsorted on every replace/insert call, compare the new element against the last one. When replacements are added in source order (the common case in webpack), the array stays marked as sorted and _sortReplacements() becomes a no-op.
