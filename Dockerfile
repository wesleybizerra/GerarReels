FROM node:20-slim

# Instalar dependências de compilação para módulos nativos (SQLite)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json ./

# Instalar dependências (incluindo devDependencies para o build e runtime)
RUN npm install

# Copiar o resto do código
COPY . .

# Gerar o build do frontend (Vite)
RUN npm run build

# Expor a porta
EXPOSE 3000

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar
CMD ["npm", "start"]