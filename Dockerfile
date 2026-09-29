FROM node:24-bookworm AS build
WORKDIR /app
ARG HTTP_PROXY
ARG HTTPS_PROXY
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --registry=https://registry.npmjs.org --no-audit --no-fund --maxsockets=4 --fetch-retries=5
COPY . .
RUN npm run db:generate && npm run build && node scripts/package-tools.cjs && mkdir -p /runtime-libs && cp /usr/lib/*-linux-gnu/libssl.so.3 /usr/lib/*-linux-gnu/libcrypto.so.3 /runtime-libs/

FROM node:24-bookworm-slim AS runtime
COPY --from=build /runtime-libs/ /usr/lib/
RUN ldconfig
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# Keep migration and seed tools in a separate directory from the standalone runtime.
COPY --from=build /migration-tools/node_modules /tools/node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts
USER node
EXPOSE 3000
CMD ["node", "server.js"]
