## Migrating an existing (non-Docker) deployment to this Docker-based setup

This document describes the practical steps to migrate an existing emap deployment (source: https://github.com/anzepirnat/emap) to the Docker setup contained in this repository (MariaDB + Gunicorn + Nginx via docker-compose / Portainer). It assumes you have access to the current server where the app is running and to the target host where you will run Docker/Portainer.

High-level steps

1. Inventory and backup: database, media/static files, custom settings.
2. Prepare Docker host and registry (if remote).
3. Export/import database (mysqldump -> dockerized MariaDB).
4. Copy media/uploads and static files (or re-run collectstatic in the container).
5. Create `.env.local` (or use Portainer env upload) filling DB credentials and hostnames.
6. Build/push any required images (nginx) or allow remote host to build from repo.
7. Deploy stack via `docker-compose` or Portainer Stack UI.
8. Run Django migrations, create superuser, test and cut over.

Detailed steps

Prereqs on target host

- Docker Engine and Docker Compose (or Portainer for Stack management)
- Enough disk to hold DB and media
- If using remote registry: Docker registry credentials

1) Backup current site

- Database dump (MySQL/MariaDB):

```bash
mysqldump -u root -p --single-transaction --quick --lock-tables=false <DB_NAME> > emap_dump.sql
```

- Copy media/uploads directory from current site (example):

```bash
rsync -avz /path/to/current/project/media/ /tmp/emap_media/
```

- Copy any custom settings (local settings, additional static files).

2) Prepare target Docker host

- (Optional) If remote host cannot build images, build locally and push images to registry:

```bash
# build nginx image and push
docker build -t myregistry/emap-nginx:latest ./docker/nginx
docker push myregistry/emap-nginx:latest
```

- Clone this repository on the target or ensure Portainer has access to the `docker-compose.yml` and the repository files.

3) Import database into Docker MariaDB

- Start the stack with an empty database volume (deploy the stack or run `docker-compose up -d` to create containers).
- Import the dump into the running MariaDB container (replace `emap-db` with actual container name if different):

```powershell
docker cp emap_dump.sql emap-db:/tmp/emap_dump.sql
docker exec -i emap-db sh -c 'exec mysql -u root -p"${DB_ROOT_PASSWORD}" ${DB_NAME}' < emap_dump.sql
```

Notes:
- If your MariaDB container is not ready, `docker exec` may fail. Wait for DB to be healthy (check `docker-compose ps` / `docker ps`).

4) Copy media and static files

- Copy previously exported media into the `media-volume` mount used by the `app` and `nginx` services. Example (adjust paths):

```bash
# copy into a temporary container with the volume mounted
docker run --rm -v "$(pwd)/tmp/emap_media":/src -v emap_media_volume:/dest busybox sh -c "cp -a /src/. /dest/"
```

- Alternatively shell into the app container and `rsync`/`scp` files directly into `/app/media` (the container path used in compose).

5) Prepare `.env.local` and Portainer

- Use `.env.sample` as template. Populate the following at minimum:
  - `DB_ROOT_PASSWORD`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST` (in compose DB host is `db`) and `SECRET_KEY`.
  - `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS` (include scheme and port if nonstandard)
  - `WEB_PORT` (host port to expose)

- If deploying with Portainer:
  - In Portainer Stacks → Add stack, paste the `docker-compose.yml` and upload your `.env.local` (Env file) or paste key/value pairs in the UI.

6) Build/push images if needed

- If the remote host builds from the repo (Portainer can build images), no action required. Otherwise build locally and push images to the registry that the target host can pull.

7) Deploy the stack

- With docker-compose (on the host):

```powershell
docker-compose build --no-cache
docker-compose up -d
docker-compose logs -f app
```

- With Portainer: Upload compose, env file and deploy stack.

8) Verify migrations & static

- If the entrypoint already runs `collectstatic` and `migrate` (this repo's `entrypoint.sh` does), the app container will perform these at start. If not, run manually:

```powershell
docker-compose exec app python manage.py migrate --noinput
docker-compose exec app python manage.py collectstatic --noinput
```

- Create a superuser if needed:

```powershell
docker-compose exec app python manage.py createsuperuser
```

9) Test the site

- Visit `http://<host-ip>:<WEB_PORT>/` and test login, file uploads, and static content.
- Tail logs for errors:

```powershell
docker-compose logs -f app
docker-compose logs -f nginx
```

10) DNS / Cut-over

- Point your DNS or proxy to the new host's `WEB_PORT` and confirm traffic is proxied to nginx. For LAN access, ensure host firewall allows the port.

Rollback plan

- Keep previous server online until you confirm the new dockerized site is fully functional.
- If rollback is needed, revert DNS/port forwards to the old host, or redeploy the old configuration. Keep the DB dump to re-import if required.

Additional tips

- CSRF and proxy headers: ensure nginx forwards `Host` and `X-Forwarded-*` headers (the nginx config in this repo does). Also set `CSRF_TRUSTED_ORIGINS` and `ALLOWED_HOSTS` correctly in `.env`.
- Collectstatic: if you use `ManifestStaticFilesStorage` you may need to fix missing references before `collectstatic` completes — switch to compressed static storage if quicker migration is needed.
- File permissions: ensure `media-volume` files are readable by the app/nginx user inside containers.

If you want, I can generate a `deploy.sh` script that:

- Builds the `emap-nginx` image and pushes to a registry (if requested)
- Runs `docker-compose build` and `docker-compose up -d`
- Waits for DB health and imports a provided SQL dump
- Copies media into the volume

Tell me whether you plan to use Portainer's build feature or a remote registry and I will provide the script accordingly.
