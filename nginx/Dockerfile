FROM nginx:alpine

# Garante que o gettext (para o envsubst) está instalado para processar o template
RUN apk add --no-cache gettext

# Copia o template de configuração para dentro do container
COPY ./conf/nginx.conf.template /etc/nginx/conf/nginx.conf.template

# Expõe as portas HTTP e HTTPS
EXPOSE 80 443

# Comando padrão que processa o template e inicia o Nginx em primeiro plano
CMD /bin/sh -c "envsubst '\$APP_DOMAIN' < /etc/nginx/conf/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"