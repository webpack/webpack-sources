---
"webpack-sources": minor
---

Add `Source.prototype.buffers()` that returns the source as `Buffer[]`. `ConcatSource`, `CachedSource`, and `CompatSource` implement it without allocating an intermediate concatenated buffer, allowing consumers that can write multiple buffers at once (e.g. via `writev`) to avoid the overhead of `Buffer.concat` in deeply nested sources.
