// eslint-disable-next-line import/no-unresolved
import { defineConfig } from "eslint/config";
import config from "eslint-config-webpack";

export default defineConfig([
	{
		extends: [config],
		rules: {
			"n/prefer-node-protocol": "off"
		}
	},
]);
