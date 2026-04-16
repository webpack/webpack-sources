/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { SizeOnlySource } = require("../../lib");

/**
 * @param {import("tinybench").Bench} bench bench
 */
module.exports = (bench) => {
	bench
		.add("SizeOnlySource: new SizeOnlySource()", () => {
			new SizeOnlySource(1024);
		})
		.add("SizeOnlySource: size()", () => {
			new SizeOnlySource(1024).size();
		})
		.add("SizeOnlySource: source() (throws)", () => {
			try {
				new SizeOnlySource(1024).source();
			} catch (_e) {
				// expected
			}
		})
		.add("SizeOnlySource: buffer() (throws)", () => {
			try {
				new SizeOnlySource(1024).buffer();
			} catch (_e) {
				// expected
			}
		})
		.add("SizeOnlySource: map() (throws)", () => {
			try {
				new SizeOnlySource(1024).map({});
			} catch (_e) {
				// expected
			}
		});
};
