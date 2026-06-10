# Usa exatamente a versão definida no seu .tool-versions
FROM node:20.19.0-alpine

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de configuração de dependências primeiro
COPY package*.json ./

# Instala as dependências internamente no container
RUN npm install

# O comando que inicia o Vite. 
# A flag --host 0.0.0.0 é obrigatória no Docker para expor a porta para a rede externa ao container.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]