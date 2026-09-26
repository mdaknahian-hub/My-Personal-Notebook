# দোকান হিসাব — প্রোডাকশন ডকার ইমেজ (Node 22 + Next.js standalone)
# বিল্ড:  docker build -t dokan-hishab .
# চালানো: docker run -p 3000:3000 -v dokan-data:/data \
#           -e AUTH_SECRET="অন্তত-৩২-অক্ষরের-গোপন-স্ট্রিং" dokan-hishab

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && mkdir -p /data && chown nextjs:nodejs /data
# SQLite ফাইল — হোস্টিংয়ে /data-তে persistent volume মাউন্ট করুন,
# নাহলে রিডিপ্লয়ে হিসাব মুছে যাবে!
ENV DATABASE_URL=/data/dokan.db
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "server.js"]
