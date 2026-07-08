FROM node:22-alpine

RUN apk add --no-cache python3 make g++

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
RUN pnpm install --filter @lectureflow/backend... --ignore-scripts && \
    cd node_modules/.pnpm/bcrypt@*/node_modules/bcrypt && npm rebuild bcrypt && \
    cd /app

COPY backend/tsconfig.json ./backend/
COPY backend/drizzle.config.ts ./backend/
COPY backend/drizzle ./backend/drizzle
COPY backend/src ./backend/src

RUN corepack enable npm && npm install -g tsx

WORKDIR /app/backend
CMD ["tsx", "src/index.ts"]
