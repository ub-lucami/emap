FROM nginx:stable-alpine

# Copy the repo nginx config into the image so no host mount or Docker Config
# is required. Build context for this service will be `./docker/nginx`.
COPY default.conf /etc/nginx/conf.d/default.conf

RUN chmod 644 /etc/nginx/conf.d/default.conf || true

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
