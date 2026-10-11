# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies needed for compiling native modules & Prisma
RUN apk add --no-cache python3 make g++ openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl curl ffmpeg

ENV NODE_ENV=production
ENV PORT=4000

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --omit=dev && npm cache clean --force
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/api/docs || exit 1

CMD ["sh", "-c", "npx prisma db push && node dist/main.js"]
