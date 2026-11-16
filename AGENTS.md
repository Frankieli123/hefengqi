# RICEWIND unified verification source

- Read `docs/project-environments.md` and the single release procedure in `docs/deployment.md` before source/release work.
- This independent repository is for local verification on 192.168.31.50. It is not a production runtime and has no deployment authority.
- Preserve the analytics ancestry at `628a3cf` and `276d14a`. CMS product translations in the Singapore production database are the content authority; never restore local/demo content into it.
- Never build the historical dirty tree, share `node_modules`, load real `.env` files, run migrations/seeds, connect to production, switch `current`, restart services or delete historical files.
- Read the relevant installed Next.js guides in `node_modules/next/dist/docs/` before changing framework behavior. Use Webpack explicitly and retain TypeScript validation.
- Product titles are CMS-owned absolute titles. Preserve canonical/hreflang and other routes' normal site-name templates.
- Explicitly stage reviewed paths only. Builds require a clean committed source and task-local release locks. Generated Next configuration changes must be saved and restored byte-for-byte.
- An offline build/package is not HTTP, database, content, browser or deployment acceptance. Report remaining gates honestly.
