FROM alpine:3.18

RUN apk add --no-cache aws-cli tzdata bash tar postgresql15-client

WORKDIR /app

COPY backup.sh .

RUN chmod +x backup.sh

CMD ["./backup.sh"]
