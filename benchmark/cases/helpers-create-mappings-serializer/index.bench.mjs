/*
 * helpers: createMappingsSerializer
 *
 * Encodes VLQ mappings for getMap / sourceAndMap. Benchmarks feed a
 * representative stream of fake mapping events against both the full
 * (column-aware) and the lines-only serializers.
 */

import createMappingsSerializer from "../../../lib/helpers/createMappingsSerializer.js";

/**
 * Build a deterministic stream of mapping events that resembles what the
 * source-map aware code paths feed through the serializer.
 * @param {number} n number of events
 * @returns {[number, number, number, number, number, number][]} events
 */
function buildEventStream(n) {
	const events = [];
	for (let i = 0; i < n; i++) {
		const generatedLine = Math.floor(i / 20) + 1;
		const generatedColumn = (i % 20) * 4;
		const sourceIndex = i % 3;
		const originalLine = Math.floor(i / 10) + 1;
		const originalColumn = (i % 10) * 3;
		const nameIndex = i % 5 === 0 ? i % 4 : -1;
		events.push([
			generatedLine,
			generatedColumn,
			sourceIndex,
			originalLine,
			originalColumn,
			nameIndex,
		]);
	}
	return events;
}

const events = buildEventStream(5000);

/**
 * @param {import("tinybench").Bench} bench bench
 */
export default function register(bench) {
	bench.add("helpers/createMappingsSerializer: full serializer", () => {
		const addMapping = createMappingsSerializer();
		let out = "";
		for (const [gl, gc, si, ol, oc, ni] of events) {
			out += addMapping(gl, gc, si, ol, oc, ni);
		}
		if (out.length === 0) throw new Error("unreachable");
	});

	bench.add("helpers/createMappingsSerializer: lines-only serializer", () => {
		const addMapping = createMappingsSerializer({ columns: false });
		let out = "";
		for (const [gl, gc, si, ol, oc, ni] of events) {
			out += addMapping(gl, gc, si, ol, oc, ni);
		}
		if (out.length === 0) throw new Error("unreachable");
	});
}
