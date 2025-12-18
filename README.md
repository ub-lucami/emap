# Deploying this Django app with Docker (MariaDB + Nginx)

This repository contains a small Django project and example Docker configuration that runs:

- Django application (Gunicorn) in `app` container
- MariaDB initialized from `docker/db/Dockerfile` (SQL in `sql/`)
- Nginx as reverse proxy and static file server (image built from `docker/nginx`)
- Static files collected into a Docker volume shared between `app` and `nginx`

This README describes how to deploy locally with `docker-compose` and how to run as a Docker Stack (Swarm). It also documents common gotchas (CSRF, static files, nginx config mounts).

**Files of interest:**
- [docker-compose.yml](docker-compose.yml)
- [Dockerfile](Dockerfile) (app image)
- [docker/db/Dockerfile](docker/db/Dockerfile) (mariadb with `sql/` COPY)
- [docker/nginx/Dockerfile](docker/nginx/Dockerfile) (nginx image with baked `default.conf`)
- [docker/nginx/default.conf](docker/nginx/default.conf)
- [landing_page/settings.py](landing_page/settings.py)
- [.env](.env)

## Prerequisites

## Prepare environment

1. Copy the example `.env` and edit values (do NOT commit secrets):

```powershell
cp .env .env.local
# edit .env.local and set DB passwords, SECRET_KEY, ALLOWED_HOSTS, WEB_PORT, etc.
```

Important fields:
- `WEB_PORT` — host port exposed for incoming HTTP (mapped to nginx container port 80)
- `ALLOWED_HOSTS` — list of allowed hostnames/IPs for Django
- `CSRF_TRUSTED_ORIGINS` — comma-separated origins (include scheme and port) that Django will accept when proxied (e.g. `http://192.168.81.21:8001,http://docker-alpine.lucami.org:8001`)
- `DEBUG` — set `True` only for local debugging

## Local development with docker-compose

1. Build and start the stack (PowerShell):

```powershell
docker-compose build --no-cache
docker-compose up -d
docker-compose logs -f app
```

Portainer / Swarm note — preferred workflow for this project

This repo is designed to be deployed from Portainer (Stack UI) by uploading the Compose file and supplying an env file via the Portainer UI. Two options for nginx config on remote hosts:

- Bake nginx config into the `docker/nginx` image (recommended here). The repo already contains `docker/nginx/Dockerfile` which copies `default.conf` into the image. Build & push to your registry if your remote host cannot build from the repo.

- Alternatively, if you manage a Swarm and prefer Docker Configs, create a Swarm config named `nginx_default_conf` from `docker/nginx/default.conf` on the manager and Portainer can reference it. (This is optional; baking into the image avoids extra steps.)
2. Verify:
- NOTE: This guide assumes you will supply environment variables via Portainer when creating the Stack. Do not commit `.env.local` to git. Use Portainer's Environment file upload or paste the variables in the Stack UI.

Portainer deployment steps (example)

1. In Portainer, go to Stacks → Add stack.
2. Paste or upload `docker-compose.yml` into the web editor.
3. Under "Env file" or "Environment variables", upload your local `.env.local` file or paste key/value pairs.
4. Deploy the stack. Portainer will substitute the variables and start services.

Notes:
- If your remote Docker host cannot build images from the repo, build and push the `emap-nginx` image to your registry and update `docker-compose.yml` to use the image tag.
- After changing the env file in Portainer, use the Stack → Re-deploy action to apply updates.
## Deploying as a Docker Stack (Swarm)

Two approaches for supplying the nginx config to remote hosts:

1. Use Docker Configs (recommended for Swarm): create a config on the Swarm manager and reference it in the compose file. Example:

```bash
# on the swarm manager, create a config from local file contents
docker config create nginx_default_conf docker/nginx/default.conf

# then deploy the stack
docker stack deploy -c docker-compose.yml emap
```

2. Bake the nginx config into an image (this repo provides `docker/nginx/Dockerfile`) so the remote host does not need a host mount or config. Build/push the image to a registry and update `docker-compose.yml` to use the published image tag.

Example build & push:

```bash
docker build -t myregistry/emap-nginx:latest ./docker/nginx
docker push myregistry/emap-nginx:latest
# then update docker-compose.yml to use image: myregistry/emap-nginx:latest for nginx
docker stack deploy -c docker-compose.yml emap
```

## Troubleshooting

- 403 CSRF (Origin checking failed):
  - Ensure `CSRF_TRUSTED_ORIGINS` contains the exact origin (scheme + host + port) shown in the Django warning.
  - Confirm nginx forwards Host and X-Forwarded headers (the `default.conf` in this repo sets these headers). Also set `USE_X_FORWARDED_HOST = True` and `SECURE_PROXY_SSL_HEADER` in `landing_page/settings.py` if TLS is terminated by nginx.

- Static files 404:
  - Make sure `collectstatic` ran and `static-volume` contains files. Inside the app container:
    ```powershell
    docker-compose exec app ls -la /app/staticfiles
    ```
  - If `DEBUG=False`, Django will not serve static files — either use WhiteNoise (configured) or let nginx serve from `static-volume`.

- Nginx config mount errors (stack deploy):
  - Bind-mounting a host file into a container can fail in Swarm. Use Docker Configs or bake the config into the nginx image (both options are covered above).

- ManifestStaticFilesStorage errors on `collectstatic`:
  - If `CompressedManifestStaticFilesStorage` fails because of missing static references, switch to `whitenoise.storage.CompressedStaticFilesStorage` in `landing_page/settings.py` and re-run `collectstatic`.

## Production recommendations

- Use a process manager or Docker healthchecks. Replace the dev `runserver` (not used here) with `gunicorn` (already used in this repo) and tune worker count.
- Serve TLS from nginx; configure strong ciphers and HTTP/2. Set `SESSION_COOKIE_SECURE = True` and `CSRF_COOKIE_SECURE = True` when serving HTTPS.
- Use a registry and immutable image tags for reproducible deployments.

## Useful commands

- Tail logs:
```powershell
docker-compose logs -f nginx
docker-compose logs -f app
```
- Enter container for debugging:
```powershell
docker-compose exec app sh
docker-compose exec nginx sh
```

## Cleaning up

```powershell
docker-compose down -v
```

If you want I can also add a short `deploy.sh` or `Makefile` that builds/pushes images and deploys the stack to a registry/Swarm manager. Tell me which option you prefer (stack vs compose), and I will add the script.

---
Generated based on the project's current Docker configuration. Adjust any filenames or registry tags to match your environment.
