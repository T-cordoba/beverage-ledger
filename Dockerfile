# syntax=docker/dockerfile:1

# Debian rather than Alpine: the API image needs glibc for argon2's prebuilt
# binaries, and keeping both images on the same base avoids two toolchains.
FROM node:22-bookworm-slim AS base
# Corepack otherwise prompts for confirmation and hangs a non-interactive build.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined into the bundle at build time, and
# src/config/api.ts throws at module scope when NEXT_PUBLIC_API_URL is empty, so
# the build cannot run without one. The consequence is that the image is bound
# to a single API origin: serving a different environment means rebuilding.
#
# The default is localhost because the browser resolves this URL, not the
# container. Even with both containers on the same Docker network, the bundle
# runs on the host's browser, where `beverage-ledger-api` does not resolve.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_GOOGLE_SIGN_IN=false
ARG NEXT_PUBLIC_BRAND_NAME=
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_GOOGLE_SIGN_IN=${NEXT_PUBLIC_GOOGLE_SIGN_IN} \
    NEXT_PUBLIC_BRAND_NAME=${NEXT_PUBLIC_BRAND_NAME} \
    BUILD_STANDALONE=true
RUN pnpm build

# Vercel does not run containers, so this stage does not produce what gets
# served: it is the environment the Vercel CLI builds and uploads from. `vercel
# pull` fetches the project's production variables, so the NEXT_PUBLIC_* values
# come from Vercel and not from the build args above. Only built with
# `--target vercel`; it sits before `runner` so a plain build still ends there.
FROM base AS vercel
# A global CLI in the image, not a repository dependency, hence npm. No install
# scripts, the same stance pnpm-workspace.yaml takes for the project.
RUN npm install -g --ignore-scripts vercel@60.1.3 && chown node:node /app
COPY --chown=node:node . .
USER node
CMD ["sh", "-c", "vercel pull --yes --environment=production --token=\"$VERCEL_TOKEN\" && vercel build --prod --token=\"$VERCEL_TOKEN\" && vercel deploy --prebuilt --prod --token=\"$VERCEL_TOKEN\""]

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# The traced bundle carries its own node_modules, so nothing is installed here.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node
EXPOSE 3000

# Node's own fetch, so the image needs no curl or wget.
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
