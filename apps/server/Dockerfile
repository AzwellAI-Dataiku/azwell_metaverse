FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY apps/server/ apps/server/

RUN pnpm --filter @metaverse/shared build
RUN pnpm --filter @metaverse/server build

# shared package.json exports를 빌드 출력(dist/)으로 변경
RUN sed -i 's|"./src/index.ts"|"./dist/index.js"|g; s|"./src/types/index.ts"|"./dist/types/index.js"|g; s|"./src/constants/index.ts"|"./dist/constants/index.js"|g' packages/shared/package.json

FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/packages/shared/ packages/shared/
COPY --from=builder /app/apps/server/dist apps/server/dist

EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s CMD wget -qO- http://localhost:4000/api/health || exit 1
CMD ["node", "apps/server/dist/index.js"]
