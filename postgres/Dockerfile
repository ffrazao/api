FROM postgres:18

ENV LANG=pt_BR.UTF-8
ENV LANGUAGE=pt_BR:pt
ENV LC_ALL=pt_BR.UTF-8

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        locales \
        postgresql-18-postgis-3 \
        postgresql-18-postgis-3-scripts && \
    echo "pt_BR.UTF-8 UTF-8" > /etc/locale.gen && \
    locale-gen pt_BR.UTF-8 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN ls -la /usr/share/postgresql/18/extension | grep postgis

# Cluster PostgreSQL usando ICU pt-BR
ENV POSTGRES_INITDB_ARGS="--locale-provider=icu --icu-locale=pt-BR --encoding=UTF8"