/*
 * Diff-runner for perf comparison.
 *
 * Usage:
 *   BENCH_OUTPUT=/tmp/before.json npm run benchmark
 *   BENCH_OUTPUT=/tmp/after.json  npm run benchmark
 *   node benchmark/compare.mjs /tmp/before.json /tmp/after.json
 */

import fs from "fs";

const [before, after] = process.argv.slice(2);
const b = JSON.parse(fs.readFileSync(before, "utf8"));
const a = JSON.parse(fs.readFileSync(after, "utf8"));

const bMap = new Map(b.map((row) => [row.name, row]));
const aMap = new Map(a.map((row) => [row.name, row]));

const rows = [];
for (const [name, aRow] of aMap) {
	const bRow = bMap.get(name);
	if (!bRow) continue;
	const bOps = Number(bRow.opsPerSec);
	const aOps = Number(aRow.opsPerSec);
	if (!bOps || !aOps) continue;
	const ratio = aOps / bOps;
	rows.push({
		name,
		before: bOps.toFixed(0),
		after: aOps.toFixed(0),
		"speedup (×)": ratio.toFixed(2),
		"delta (%)": ((ratio - 1) * 100).toFixed(1),
	});
}
rows.sort((i1, i2) => Number(i1["speedup (×)"]) - Number(i2["speedup (×)"]));
console.table(rows);

const overall =
	rows.reduce((i1, i2) => i1 + Number(i2["speedup (×)"]), 0) / rows.length;
const wins = rows.filter((r) => Number(r["speedup (×)"]) > 1.05).length;
const losses = rows.filter((r) => Number(r["speedup (×)"]) < 0.95).length;

console.log();
console.log(
	`Summary: ${rows.length} tasks, avg speedup ×${overall.toFixed(2)}, ` +
		`${wins} with >5% improvement, ${losses} with >5% regression`,
);
