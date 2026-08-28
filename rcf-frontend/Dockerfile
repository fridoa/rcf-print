# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app


# ---------------------------------------------------------------------------
# deps
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci


# ---------------------------------------------------------------------------
# development: vite dev server dengan HMR.
#
# host 0.0.0.0 wajib: default vite hanya bind ke localhost DI DALAM
# container, jadi port publish-nya kelihatan terbuka tapi connection
# refused dari host.
# ---------------------------------------------------------------------------
FROM deps AS development
ENV NODE_ENV=development
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


# ---------------------------------------------------------------------------
# test: vitest + jsdom di dalam container
# ---------------------------------------------------------------------------
FROM deps AS test
COPY . .
CMD ["npm", "test"]


# ---------------------------------------------------------------------------
# build: hasilkan /app/dist
#
# VITE_API_URL harus tersedia SAAT BUILD, bukan runtime — Vite meng-inline
# import.meta.env ke dalam bundle. Set lewat build arg, bukan environment
# di compose, kalau tidak nilainya jadi undefined dan client jatuh ke "/api/v1".
# ---------------------------------------------------------------------------
FROM deps AS build
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
COPY . .
RUN npm run build


# ---------------------------------------------------------------------------
# production: nginx menyajikan static build
# ---------------------------------------------------------------------------
FROM nginx:1.29-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
