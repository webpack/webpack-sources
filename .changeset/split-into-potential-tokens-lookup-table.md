---
"webpack-sources": patch
---

perf: use lookup table in splitIntoPotentialTokens for faster character classification

Replace multi-comparison chains (4 comparisons in phase 1, 6 in phase 2) with a single Uint8Array bitmask lookup per character. This reduces per-character branching overhead, yielding ~7% improvement on typical source and ~21% on large sources.
