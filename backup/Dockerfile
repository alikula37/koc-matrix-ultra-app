FROM postgres:16-alpine
RUN apk add --no-cache bash tzdata rclone
ENV TZ=Europe/Istanbul
WORKDIR /app
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh
# cron via infinite loop (simple, no supercronic needed for MVP)
CMD ["bash", "-c", "echo \"Backup container started — cron $BACKUP_CRON\" && while true; do /usr/local/bin/backup.sh; sleep 86400; done"]
