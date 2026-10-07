FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --ignore-scripts
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app /app
RUN npm prune --omit=dev
ENV NODE_ENV=production
ENV STATIC_ROOT=/app/dist
EXPOSE 3000
CMD ["node","server.js"]
