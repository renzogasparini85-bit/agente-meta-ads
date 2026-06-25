FROM node:22.13.1-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=optional

COPY . .
RUN npm run build

FROM node:22.13.1-bookworm-slim

WORKDIR /app

RUN npm install -g serve@14.2.4
COPY --from=build /app/dist ./dist

CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT:-4173}"]
