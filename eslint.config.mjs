import nextVitalsConfig from "eslint-config-next/core-web-vitals.js";
import nextTsConfig from "eslint-config-next/typescript.js";

export default [
  nextVitalsConfig,
  nextTsConfig,
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"]
  }
].flat();
