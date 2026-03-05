FROM node:20-slim

# Instalar dependências de compilação para módulos nativos (SQLite)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar apenas o package.json para instalar dependências primeiro (cache)
COPY package.json ./

# Instalar todas as dependências (incluindo devDependencies para o build)
RUN npm install

# Copiar o resto do código do projeto
COPY . .

# Gerar o build do frontend (Vite)
RUN npm run build

# Expor a porta padrão
EXPOSE 3000

# Variáveis de ambiente de produção
ENV NODE_ENV=production
ENV PORT=3000

# Comando de inicialização
CMD ["npm", "start"]