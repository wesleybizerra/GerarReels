# ... (estágio anterior)
# Copiar arquivos de dependências
COPY package.json package-lock.json* ./

# Instalar dependências (incluindo devDependencies para o build)
RUN npm ci
# ... (restante do arquivo)