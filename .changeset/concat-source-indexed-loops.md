---
"webpack-sources": patch
---

Replace `for...of` iteration over `_children` with indexed loops in
`ConcatSource` hot paths (`source`, `size`, `buffer`, `buffers`,
`updateHash`, `streamChunks`, `_optimize`, constructor, `add`,
`addAllSkipOptimizing`). Eliminates per-call iterator allocation and the
`[Symbol.iterator]/.next()` protocol overhead.

Median-of-3 benchmark gains over baseline:

- `concat-source: buffers() (10 raw)` +47%
- `concat-source: buffers() (nested 4x10 raw)` +44%
- `cached-source: buffer() (cold, wraps ConcatSource x10)` +38%
- `concat-source: source() (mixed)` +25%
- `concat-source: source() (10 raw)` +24%
- `concat-source: nested flattening` +21%
- `concat-source: buffer() (10 raw)` +13%
- `concat-source: new ConcatSource() (strings)` +12%
- `cached-source: buffers() (cold, wraps ConcatSource x10)` +11%
