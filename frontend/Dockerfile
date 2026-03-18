FROM oven/bun:1.2-alpine AS builder
WORKDIR /app
COPY frontend/package.json ./
RUN bun install
COPY frontend .
RUN bun run build

FROM oven/bun:1.2-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app .
EXPOSE 3000
CMD ["bun", "run", "start"]
