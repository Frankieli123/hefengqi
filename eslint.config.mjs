import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  { rules: { "@next/next/no-html-link-for-pages": "off" } },
  globalIgnores([".next/**", ".agents/**", ".codex/**", "coverage/**", "playwright-report/**", "public/media/**", "public/uploads/**", "tmp/**", "output/**", "/*.js", "/*.py", "batch*_assets/**", "batch*_repainted/**", "batch_images*/**", "clean_ingest_assets/**"]),
]);
