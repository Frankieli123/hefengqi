FROM postgres:16-alpine
RUN apk add --no-cache restic ca-certificates
COPY backup.sh /usr/local/bin/backup.sh
COPY backup-loop.sh /usr/local/bin/backup-loop.sh
COPY restore.sh /usr/local/bin/restore.sh
RUN chmod 0755 /usr/local/bin/backup.sh /usr/local/bin/backup-loop.sh /usr/local/bin/restore.sh
ENTRYPOINT ["/usr/local/bin/backup-loop.sh"]
