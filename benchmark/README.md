# Benchmarks

Performance benchmarks for `webpack-sources`, tracked over time via
[CodSpeed](https://codspeed.io/).

Runner stack: [tinybench](https://github.com/tinylibs/tinybench) +
[`@codspeed/core`](https://www.npmjs.com/package/@codspeed/core) with a local
`withCodSpeed()` wrapper ported from webpack's
`test/BenchmarkTestCases.benchmark.mjs` (also used by `enhanced-resolve`).
Locally it falls back to plain tinybench wall-clock measurements, and under
`CodSpeedHQ/action` in CI it automatically switches to CodSpeed's
instrumentation mode.

## Running locally

```sh
npm run benchmark
```

Optional substring filter to run only matching cases:

```sh
npm run benchmark -- replace-source
BENCH_FILTER=source-map npm run benchmark
```

Locally the runner uses tinybench's wall-clock measurements and prints a
table of ops/s, mean, p99, and relative margin of error per task. Under CI,
the wrapper detects the CodSpeed runner environment and switches to
instruction-counting mode automatically.

The V8 flags in `package.json` (`--no-opt --predictable --hash-seed=1` etc.)
are required by CodSpeed's instrumentation mode for deterministic results —
do not drop them.

### Optional: running real instruction counts locally

If you want to reproduce CI's exact instrument-count numbers on your own
machine (Linux only — the underlying Valgrind tooling has no macOS backend),
install the standalone CodSpeed CLI and wrap `npm run benchmark` with it:

```sh
curl -fsSL https://codspeed.io/install.sh | bash
codspeed run npm run benchmark
```

This is only useful if you want to debug an instruction-count regression
outside CI. Day-to-day benchmark iteration should use `npm run benchmark`
directly (wall-clock mode).

## Layout

```
benchmark/
├── run.mjs                     # entry point: discovers cases, runs bench
├── with-codspeed.mjs           # CodSpeed <-> tinybench bridge
├── fixtures.mjs                # shared fixture loaders
└── cases/
    └── <case-name>/
        ├── index.bench.mjs     # default export: register(bench, ctx)
        └── fixture/            # optional: per-case input files
```

Each case directory must contain `index.bench.mjs` exporting a default
function with the signature:

```js
export default function register(bench, { caseName, caseDir, fixtureDir }) {
	bench.add("my case: descriptive name", () => {
		// ... code to measure ...
	});
}
```

`fixtureDir` is the absolute path to the case's `fixture/` subdirectory
(which may or may not exist). `caseDir` is the parent directory containing
`index.bench.mjs`.

Each task body should loop over a small batch of operations rather than
performing a single call — tinybench decides its own iteration count, so
we want the measurement to reflect per-batch throughput, which is more
stable than per-call timing for sub-microsecond work.

## Existing cases

### Per source class

| Case                | What it measures                                                                |
| ------------------- | ------------------------------------------------------------------------------- |
| `raw-source`        | `RawSource` constructor, string/buffer accessors, streamChunks, updateHash      |
| `original-source`   | `OriginalSource` map/sourceAndMap/streamChunks across columns on/off combos     |
| `replace-source`    | `ReplaceSource` source/map/streamChunks for no, few, and many replacements      |
| `concat-source`     | `ConcatSource` \_optimize, source/buffer/map, nested flattening, hash           |
| `prefix-source`     | `PrefixSource` delegation + newline prefix rewriting                            |
| `source-map-source` | `SourceMapSource` full + lines-only streamChunks, including combined inner maps |
| `cached-source`     | `CachedSource` cold vs warm, plus `getCachedData()` round-trip                  |
| `compat-source`     | `CompatSource` delegation vs `Source.prototype` fallback paths                  |
| `size-only-source`  | `SizeOnlySource` constructor, `size()`, and the throw paths for other accessors |

### Per helper module

| Case                                  | What it measures                                                         |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `helpers-split-into-lines`            | `splitIntoLines` scanner on fixture / big / long-line / empty inputs     |
| `helpers-split-into-potential-tokens` | `splitIntoPotentialTokens` scanner used by column-aware OriginalSource   |
| `helpers-get-generated-source-info`   | `getGeneratedSourceInfo` final-line/column probe on various input shapes |
| `helpers-read-mappings`               | VLQ decoder used by every source-map aware streamChunks path             |
| `helpers-create-mappings-serializer`  | VLQ encoder (full + lines-only) fed a representative event stream        |
| `helpers-string-buffer-utils`         | `internString` and enter/exitStringInterningRange                        |

### End-to-end

| Case                            | What it measures                                                                                                                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `realistic-source-map-pipeline` | OriginalSource -> ReplaceSource -> ConcatSource -> CachedSource (cold + warm); also `buffer()` vs `buffers()` over the `CachedSource -> ConcatSource -> CachedSource -> ConcatSource` layering from issue #157 |

## Memory benchmarks

`benchmark/memory/<case>/` holds memory-focused benchmarks. There are
two complementary entry points per case:

- `index.bench.mjs` — tinybench tasks shaped for CodSpeed's memory
  instrument (`@codspeed/core` v5.2.0+, runner mode `"memory"`).
  Discovered by `benchmark/run-memory.mjs`. Run via:

  ```sh
  npm run benchmark:memory
  ```

  In CI, `.github/workflows/benchmarks.yml` runs the same script
  under the CodSpeed action with `mode: "memory"`; results (peak
  heap, total allocations, allocation timeline) are uploaded to
  codspeed.io alongside the CPU benchmarks. Locally, without CodSpeed,
  the runner falls back to plain wall-clock tinybench output — useful
  only as a smoke test that the bench compiles and runs.

- `snapshot.mjs` — standalone developer script using
  `process.memoryUsage()` snapshots. Run manually with `--expose-gc`:

  ```sh
  node --expose-gc benchmark/memory/clear-cache/snapshot.mjs
  TASKS=500 COPIES=8 node --expose-gc benchmark/memory/clear-cache/snapshot.mjs
  ```

  Produces a human-readable RSS / heapUsed breakdown across multiple
  scenarios (unique tasks, shared modules, post-minifier shape). Best
  for ad-hoc investigations where you want to see absolute MB numbers
  on your own machine.

| Case                 | What it measures                                                                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clear-cache`        | Heap growth and allocation count for `CachedSource.clearCache()` across the post-minifier asset shape, the shared-modules-across-chunks shape, and the dedup `visited` walk (#20961).           |
| `raw-source`         | Constructor allocations for string- and Buffer-backed inputs, lazy `buffer()` materialisation, and the `_cachedHashUpdate` payload populated by `updateHash`.                                   |
| `original-source`    | `map()` mapping segment allocations for `columns: true` vs `columns: false`, plus full `sourceAndMap`.                                                                                          |
| `source-map-source`  | Constructor dual-cached pair population, `map()` normalisation, and the combined-inner-map `sourceAndMap` path (the heaviest single allocation pattern in the suite).                           |
| `replace-source`     | Per-replacement growth and `source()`/`map()` allocations across 100 spread insertions over a `SourceMapSource` body.                                                                           |
| `concat-source`      | Child-array growth, `source()` string concatenation, `buffers()` Buffer-array build, and `map()` composition across two `SourceMapSource` children.                                             |
| `prefix-source`      | `buildPrefixed` regex-driven string rewrite (`source()`) and the `buffer()` Buffer.from path.                                                                                                   |
| `cached-source`      | Cold vs warm `sourceAndMap` (cold populates `_cachedSource`/`_cachedBuffer`/`_cachedMaps`; warm returns references), `getCachedData()` BufferedMap allocation, and constructor-from-cached path. |
| `compat-source`      | Wrapper construction over Source instances, delegated `source()`/`map()`, and the `CompatSource.from()` short-circuit when the input is already a Source.                                       |
| `size-only-source`   | Minimal constructor allocation — included so accidental growth on the smallest Source surfaces in the dashboard.                                                                                |

## Adding a new case

1. Create `benchmark/cases/<case-name>/index.bench.mjs`.
2. Export a default `register(bench, ctx)` function. Call `bench.add(name, fn)`
   for each task.
3. If the case needs input files, place them under
   `benchmark/cases/<case-name>/fixture/` and read them from `ctx.fixtureDir`.
4. Run `npm run benchmark -- <case-name>` to verify locally.

Each task name should start with the case directory name (e.g.
`raw-source: source()`) so CodSpeed's report groups tasks by module.
