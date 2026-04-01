# Stage 1: Build React app
FROM node:20-alpine AS build

WORKDIR /app


COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

ENV BACKEND_UPSTREAM=http://backend:8080

COPY nginx.conf /etc/nginx/templates/default.conf.template


EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
