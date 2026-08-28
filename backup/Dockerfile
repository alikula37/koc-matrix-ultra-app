FROM postgres:16-alpine
RUN apk add --no-cache bash tzdata rclone curl supercronic
ENV TZ=Europe/Istanbul
WORKDIR /app
COPY backup.sh /usr/local/bin/backup.sh
COPY crontab /etc/crontab
RUN chmod +x /usr/local/bin/backup.sh
# postgres image has entrypoint docker-entrypoint.sh — override for backup cron
ENTRYPOINT []
# supercronic — prod-grade cron (ist: 03:00 Europe/Istanbul = 00:00 UTC)
CMD ["sh", "-c", "echo \"Backup with supercronic — $BACKUP_CRON (IST 03:00 -> UTC 00:00)\" && supercronic /etc/crontab"]
