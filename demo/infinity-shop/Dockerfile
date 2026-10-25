FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js app.js index.html bfsi.html ecommerce.html styles.css consent-init.js matomo-tracker.js matomo.js dpdp-subject.js matomo-dsar-bridge.js dpdp-email.js ./
COPY assets ./assets
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
