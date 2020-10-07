# Stage 0, "build-stage", based on Node.js, to build and compile the frontend
FROM node:current-alpine as build-stage
WORKDIR /app
COPY package*.json /app/
RUN npm install
COPY ./ /app/
RUN npm run build


# Stage 1, based on Nginx, to have only the compiled app, ready for production with Nginx
# Original by Stefan here: https://github.com/NERSC/spin-recipes/tree/master/nginx-rootless

# This image extends the official nginx image to run as an arbitrary UID/GID.

# See the README.md for usage.

FROM nginx:latest

# RUN apt-get update && apt-get install -y curl

LABEL \
  org.opencontainers.image.authors="Stefan Lasiewski <slasiewski@lbl.gov>" \
  org.opencontainers.image.description="This image extends the official httpd image to run as an arbitrary UID/GID."

# Make /var/cache/nginx/ writable by non-root users
RUN chgrp nginx /var/cache/nginx/
RUN chmod g+w /var/cache/nginx/

EXPOSE 8081

# Write the PID file to a location where regular users have write access. Not Standards compliant.
RUN sed -i.bak -e 's%^pid        /var/run/nginx.pid;%pid        /var/tmp/nginx.pid;%' /etc/nginx/nginx.conf

COPY ./nginx_config/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-stage /app/build/ /usr/share/nginx/html
