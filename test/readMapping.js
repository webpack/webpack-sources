"use strict";

const readMappings = require("../lib/helpers/readMappings");

describe("readMappings", () => {
	it("should correctly decode negative VLQ deltas (backwards column references)", () => {
		const mappings = [];

		// Mapping with a negative column delta (backwards reference)
		readMappings(
			"AAKA;CAAC",
			(
				generatedLine,
				generatedColumn,
				sourceIndex,
				originalLine,
				originalColumn,
				nameIndex,
			) => {
				mappings.push({
					generatedLine,
					generatedColumn,
					sourceIndex,
					originalLine,
					originalColumn,
					nameIndex,
				});
			},
		);

		expect(mappings).toHaveLength(2);

		// First mapping: line 1, col 0, source 0, orig line 5, orig col 0
		expect(mappings[0].generatedLine).toBe(1);
		expect(mappings[0].generatedColumn).toBe(0);
		expect(mappings[0].sourceIndex).toBe(0);
		expect(mappings[0].originalLine).toBe(5);
		expect(mappings[0].originalColumn).toBe(0);

		// Second mapping: line 2 — negative delta on originalColumn (col goes backwards)
		expect(mappings[1].generatedLine).toBe(2);
		expect(mappings[1].generatedColumn).toBe(1);
		expect(mappings[1].sourceIndex).toBe(1);
		expect(mappings[1].originalLine).toBe(5);
		expect(mappings[1].originalColumn).toBe(-1);
	});

	it("should handle mappings without source info", () => {
		const mappings = [];

		readMappings("A", (generatedLine, generatedColumn, sourceIndex) => {
			mappings.push({ generatedLine, generatedColumn, sourceIndex });
		});

		expect(mappings).toHaveLength(1);
		expect(mappings[0].generatedLine).toBe(1);
		expect(mappings[0].generatedColumn).toBe(0);
		expect(mappings[0].sourceIndex).toBe(-1);
	});

	it("should handle multiple lines", () => {
		const mappings = [];

		readMappings(
			"AAAA;AACA;AACA",
			(generatedLine, generatedColumn, sourceIndex, originalLine) => {
				mappings.push({ generatedLine, generatedColumn, originalLine });
			},
		);

		expect(mappings).toHaveLength(3);
		expect(mappings[0].generatedLine).toBe(1);
		expect(mappings[1].generatedLine).toBe(2);
		expect(mappings[2].generatedLine).toBe(3);
	});
});
