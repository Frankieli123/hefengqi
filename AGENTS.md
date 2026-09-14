<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## RICEWIND repository rules

Before changing public-site content, UI, CMS behavior, APIs, SEO, media, or
deployment, read `docs/site-change-standard.md` completely and follow its
source-of-truth map, protected-file boundaries, multilingual requirements, and
verification matrix.

- For any visual or interaction change, also read `docs/design-system.md`.
- For production, caching, or release changes, also read `docs/deployment.md`.
- For AI product-ingestion changes, also read `docs/ai-product-api.md`.
- Never edit generated/runtime paths (`.next/`, `next-build/`, `current`,
  `.releases/`) or real secrets in `.env*`.
- CMS-managed business content must remain CMS-managed; do not hardcode a
  second copy in page components or demo data.
