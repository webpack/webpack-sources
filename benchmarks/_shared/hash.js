/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const crypto = require("crypto");

// Small factory for a HashLike passed to updateHash() benchmarks. Using a real
// crypto hash keeps the work realistic without dominating the benchmark.
const createHash = () => crypto.createHash("sha256");

module.exports = { createHash };
