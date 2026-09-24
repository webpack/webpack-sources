---
"webpack-sources": patch
---

perf: hash a string-backed source without materializing its buffer

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
