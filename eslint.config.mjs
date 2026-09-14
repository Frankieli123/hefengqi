import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  { rules: { "@next/next/no-html-link-for-pages": "off" } },
  globalIgnores([".next/**", "next-build/**", "next-perfcheck/**", ".releases/**", "current/**", ".agents/**", ".codex/**", "coverage/**", "playwright-report/**", "public/media/**", "public/uploads/**", "tmp/**", "output/**", "*.js", "*.py", "scripts/db_dispatcher.js", "scripts/prune_faqs_to_core.js", "batch*_assets/**", "batch*_repainted/**", "batch_images*/**", "clean_ingest_assets/**"]),
]);
