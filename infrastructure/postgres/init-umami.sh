#!/bin/sh
set -eu
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=umami_password="$UMAMI_DB_PASSWORD" <<'EOSQL'
CREATE ROLE umami WITH LOGIN PASSWORD :'umami_password';
EOSQL
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c 'CREATE DATABASE umami OWNER umami;'
