// @ts-check
import { dirname } from "path";
import { fileURLToPath } from "url";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  {
    ignores: [".next/**", "out/**", "build/**"],
  },
];

export default config;
