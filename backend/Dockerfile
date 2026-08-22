# syntax=docker/dockerfile:1

# Node 22 karena package.json menuntut node >=20.19 dan 22 adalah LTS aktif.
# Alpine dipakai karena semua dependensi backend murni JavaScript
# (bcryptjs, bukan bcrypt) — tidak ada modul native yang perlu dikompilasi,
# jadi tidak butuh build-base/python di image.
FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=development
# dumb-init menjadi PID 1 supaya SIGTERM/SIGINT diteruskan ke node.
# Tanpa ini, shutdown handler di server.js tidak pernah jalan dan
# `docker compose down` selalu menunggu 10 detik lalu SIGKILL.
RUN apk add --no-cache dumb-init


# ---------------------------------------------------------------------------
# deps: layer terpisah supaya `npm ci` hanya diulang kalau manifest berubah
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci


# ---------------------------------------------------------------------------
# development: dipakai docker-compose. Source code TIDAK di-COPY,
# tapi di-bind mount dari host supaya nodemon melihat perubahanmu.
# node_modules tetap dari image (lihat volume anonim di compose).
# ---------------------------------------------------------------------------
FROM deps AS development
ENV APP_ENV=development
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "dev"]


# ---------------------------------------------------------------------------
# autotest: menjalankan vitest di dalam container.
# Sengaja target sendiri supaya `npm test` tidak pernah kebetulan jalan
# dengan APP_ENV=development — test suite menghapus collection.
# ---------------------------------------------------------------------------
FROM deps AS autotest
ENV APP_ENV=autotest
COPY . .
CMD ["npm", "test"]


# ---------------------------------------------------------------------------
# production: dependensi produksi saja, jalan sebagai user non-root.
# ---------------------------------------------------------------------------
FROM base AS production
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node . .
USER node
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
