FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]

FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_APP_NAME=GENTRADE
ARG VITE_APP_URL=http://localhost:5173

COPY package*.json ./
RUN npm ci

COPY . .

# Create .env.production with build args for Vite
RUN echo "VITE_APP_NAME=${VITE_APP_NAME}" > .env.production && \
    echo "VITE_APP_URL=${VITE_APP_URL}" >> .env.production

RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
