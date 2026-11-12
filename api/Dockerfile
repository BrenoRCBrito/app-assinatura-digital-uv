FROM docker.io/library/node:26-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund --no-update-notifier

COPY tsconfig.json ./
COPY src ./src
RUN mkdir dados && chown node:node dados

ENV NODE_ENV=production
USER node
EXPOSE 3000

HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/saude').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

CMD ["node_modules/.bin/tsx", "src/servidor.ts"]
