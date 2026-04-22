---
"webpack-sources": patch
---

fix: use Int32Array for signed VLQ delta accumulation in `readMappings` so cumulative values that go negative are preserved instead of wrapping to a large unsigned integer
