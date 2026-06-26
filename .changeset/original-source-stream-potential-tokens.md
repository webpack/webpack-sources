---
"webpack-sources": patch
---

perf: stream potential tokens in OriginalSource instead of materialising an array

`OriginalSource.streamChunks` (and therefore `map()` / `sourceAndMap()`) previously built the full `splitIntoPotentialTokens` array of substrings and then iterated it — even though `map()` and `sourceAndMap()` run with `finalSource: true` and discard every chunk substring. The scan is now streamed by offset, so chunk substrings are only allocated when actually emitted. This removes the intermediate array and, on the dominant final-source paths, all per-token slices: `map()` / `sourceAndMap()` allocate ~38–46% less memory and run ~15–40% faster.
