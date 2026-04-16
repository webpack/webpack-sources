import { defineConfig } from "eslint/config";
import config from "eslint-config-webpack";

export default defineConfig([
	{
		extends: [config],
		rules: {
			"n/prefer-node-protocol": "off",
		},
	},
	{
		files: ["benchmarks/**/*.js"],
		rules: {
			"no-console": "off",
			"no-new": "off",
			"n/no-process-exit": "off",
			"n/no-unpublished-require": "off",
			"jsdoc/require-jsdoc": "off",
			"import/order": "off",
			"prettier/prettier": "off",
			"prefer-destructuring": "off",
			"@stylistic/quotes": "off",
			"@stylistic/padding-line-between-statements": "off",
		},
	},
]);
