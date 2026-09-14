# HEFENGQI production deployment

This project is designed for a mainland-China Linux origin behind Tencent EdgeOne. EdgeOne is the only intended public client of the origin HTTPS listener on TCP 8443.

## One-time server preparation

1. Install Docker Engine with the Compose plugin, Git, curl, jq, Python 3 and nftables on a 4-core / 8-GB-or-larger Linux server.
2. Put this repository at `/srv/hefengqi` and copy `.env.example` to `.env.production`. Keep that file mode `0600` and fill every non-optional value with verified production data. `SITE_URL` is the public canonical URL, `PUBLIC_HOST` is that URL's bare hostname without a scheme or path, and `ORIGIN_HOST` is the private hostname used only between EdgeOne and the origin.
3. Log Docker into `ghcr.io` with a read-only token if the repository image is private.
4. Generate one stable Server Actions key with `openssl rand -base64 32`. Store the same value as `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` in `.env.production` and in the GitHub `production` environment. Do not regenerate it for routine deployments. The CI build passes it through a BuildKit secret, so it is not persisted in a Docker layer.
5. Set the GitHub `production` environment secrets `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_SSH_PORT` and `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`.
6. Set `APP_IMAGE` in `.env.production` to `ghcr.io/<owner>/<repository>`. Each release publishes the web image as `<git-sha>` and the worker image as `<git-sha>-worker`; `IMAGE_TAG` is updated automatically by the deployment script.
7. Run the first deployment from the `main` branch, then create the initial administrator with `docker compose --env-file .env.production run --rm worker ./node_modules/.bin/tsx scripts/bootstrap-admin.ts`.

`SITE_URL`, `TURNSTILE_SITE_KEY`, `UMAMI_WEBSITE_ID` and `UMAMI_SCRIPT_URL` are runtime server variables. Do not rename them to `NEXT_PUBLIC_*`: Next.js freezes public variables into the browser bundle during image build. The statistics dashboard also requires the server-only `UMAMI_USERNAME` and `UMAMI_PASSWORD`; never expose either value through public environment variables or client components. `UMAMI_API_URL` is `http://umami:3000` in Compose and can remain `http://127.0.0.1:3008` for the current direct systemd deployment.

Update `SITE_CONTENT_UPDATED_AT` whenever static company, legal, privacy or terms content changes. Dynamic product and editorial entries use their database update timestamps instead.

## EdgeOne and origin boundary

- Configure the public domain in EdgeOne with origin HTTPS port `8443`.
- Set origin Host and TLS SNI to `ORIGIN_HOST` so the private origin certificate is verified correctly.
- Caddy replaces the upstream `Host` and `X-Forwarded-Host` with `PUBLIC_HOST`. This keeps the browser `Origin` and the host seen by Next.js identical for Server Actions CSRF validation, even though EdgeOne connects with `ORIGIN_HOST`.
- Inject `X-HFQ-Origin: <ORIGIN_SHARED_SECRET>` on origin requests and strip that header from viewer requests.
- Do not expose origin ports 80 or 443. Permit TCP 8443 only from current official EdgeOne origin ranges.
- Run `scripts/sync-edgeone-ips.sh` from a root-owned systemd timer or cron job. Set `EDGEONE_IP_URL` to Tencent's official range endpoint and alert on update failure. The script validates all candidates before atomically replacing its nftables table.

### Required cache rules

Do not apply a blanket browser or edge TTL to the whole hostname. It can leave an old HTML/RSC document pointing at JavaScript from a different release.

- Bypass edge caching for HTML, RSC, `/admin/*`, `/api/*`, search and preview responses. Respect the origin `Cache-Control: private, no-store` header.
- Cache only `/_next/static/*` and hashed `/media/*` assets for one year with `immutable`.
- Keep `/_next/image*` on a shorter policy unless every source URL is content-addressed.
- Purge cached HTML after every deployment if an old EdgeOne rule previously cached public pages.

Verify both a document and a hashed asset after changing EdgeOne:

```sh
curl -I https://ricewind.com/zh
curl -I https://ricewind.com/_next/static/chunks/<current-hash>.js
```

The first response must be `private, no-store`; the second must be `public, max-age=31536000, immutable`.

On the current NAS preview, the Caddy admin API is disabled. After changing
`Caddyfile`, restart the `hefengqi-edge-proxy` container so the mounted
configuration is loaded; `caddy reload` cannot be used when `admin off` is set.

### Direct systemd deployment on the current NAS

The current non-Docker preview uses a standalone Next.js service. Never run `next build` into the `.next` directory while that directory is serving traffic: Next.js removes and recreates it during a build, which can mix manifests and chunks from different releases.

Install `infrastructure/systemd/hefengqi.service` once, then publish through the isolated release script:

```sh
sudo cp infrastructure/systemd/hefengqi.service /etc/systemd/system/hefengqi.service
sudo systemctl daemon-reload
sudo ./scripts/deploy-standalone.sh
```

The script builds into a unique directory, verifies the standalone artifact, switches the `current` symlink atomically, restarts once, checks readiness and rolls the symlink back if health verification fails. Builds are locked so two publishers cannot run concurrently.

## Data and backups

PostgreSQL, original private uploads and published image variants live in Docker volumes. The backup service writes a custom PostgreSQL dump and sends it with both media volumes to encrypted restic storage in the configured off-site MinIO bucket.

List snapshots:

```sh
docker compose --env-file .env.production run --rm --entrypoint restic backup snapshots
```

Restore the database only after putting the web and worker services into maintenance:

```sh
docker compose --env-file .env.production stop web worker
docker compose --env-file .env.production run --rm -e CONFIRM_RESTORE=RESTORE_HEFENGQI --entrypoint /usr/local/bin/restore.sh backup latest database
docker compose --env-file .env.production up -d --wait web worker gateway
```

For database plus media, add `-e CONFIRM_MEDIA_RESTORE=RESTORE_MEDIA` and replace `database` with `all`. Test a full restore on an isolated host before launch and at least quarterly afterward.

## Release checklist

- Replace the `HEFENGQI` temporary brand and all demo content with verified company names, addresses, registration details, product data and licensed media.
- Confirm `.env.production` uses `SITE_URL`, `TURNSTILE_SITE_KEY`, `UMAMI_WEBSITE_ID` and `UMAMI_SCRIPT_URL`, with no deprecated `NEXT_PUBLIC_*` aliases.
- Confirm the GitHub build secret and server runtime value for `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` are identical and decode to 16, 24 or 32 bytes.
- Verify Resend sender-domain DNS, sales inbox delivery and all seven customer-facing languages.
- Verify Turnstile, Umami, EdgeOne WAF/rate limits, cache bypass for admin/API/search/compare, origin secret header and cache purge credentials.
- Confirm ICP footer data and localized privacy/terms text with the responsible legal owner.
- Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, `docker compose config -q` and a production image build.
