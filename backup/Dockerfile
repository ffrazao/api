FROM postgres:18-alpine

RUN apk add --no-cache aws-cli tzdata bash tar

WORKDIR /app

COPY backup.sh .

RUN chmod +x backup.sh

CMD ["./backup.sh"]
