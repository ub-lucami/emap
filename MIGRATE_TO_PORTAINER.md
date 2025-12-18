MIGRATE AN EXISTING REPO TO A DOCKER STACK (Portainer)
===============================================

Goal
----
Fork an existing Python/Django repo (the "python single Docker" repo you own), apply the Docker stack + MariaDB + nginx changes from this sample repository, include an SQL init file (init.sql), and deploy the fork from Portainer Stacks by pointing Portainer at your GitHub repo and uploading an env file.

This document provides exact commands and brief explanations.

Assumptions
-----------
- You have a GitHub account and can fork repositories.
- You have a local machine with this sample repo checked out (the files you want to copy from).
- You have `git`, `ssh`, `docker`/`docker-compose` (optional) and `mysqldump` available where relevant.
- You will use Portainer's "Stacks" UI to deploy from the forked repo and upload a local env file in the Portainer UI.

High-level steps
-----------------
1. Fork the target repo on GitHub (the repo you own that currently runs python single Docker).
2. Export (dump) the existing site's SQL data from the current DB.
3. Clone your fork locally and copy this sample's Docker files and SQL file into it.
4. Commit and push the changes to your fork.
5. In Portainer: Stacks → Add stack → Repository: your fork → Supply env file → Deploy.

Detailed commands (exact)
------------------------

1) Fork on GitHub (use GitHub web)

- In your browser open the upstream repository (the one you currently run) and click **Fork** → choose your GitHub account. This creates `github.com/<you>/<your-repo>`.
- Open your fork in the web UI and confirm files are visible. Optionally change the default branch name or repository settings as you prefer.

Working locally with VS Code (Git UI)

Use VS Code's built-in Git support and Explorer to work with your fork without typing Git commands. Brief GUI steps:

1. Clone your fork via VS Code:
	- Open VS Code. Press Ctrl+Shift+P (Cmd+Shift+P on macOS) → `Git: Clone` → paste your fork URL (`https://github.com/<you>/<your-repo>.git` or SSH URL).
	- When prompted, choose a local folder and open the repository in VS Code.

2. (Optional) Add the upstream remote so you can pull future upstream changes:
	- Command Palette → `Git: Add Remote...` → name it `upstream` and paste the upstream repo URL (`https://github.com/<original_owner>/<original_repo>.git`).
	- If your VS Code does not show `Git: Add Remote...`, open the integrated terminal (View → Terminal) and run:
	  ```bash
	  git remote add upstream https://github.com/<original_owner>/<original_repo>.git
	  git fetch upstream
	  ```

3. Create a working branch using the Source Control UI:
	- Click the branch indicator in the lower-left corner → `Create new branch` → name it `feature/apply-docker-sample`.

4. Copy sample files into your fork using VS Code Explorer:
	- In VS Code's Explorer view, drag-and-drop or copy files from your local sample checkout (or use your OS file manager). Files to add: `docker-compose.yml`, `Dockerfile`, `docker/nginx/*`, `docker/db/*`, `entrypoint.sh`, `sql/init.sql` (optional), and `landing_page/settings.py` changes, plus `.env.sample`.

5. Stage and commit changes in the Source Control view:
	- Open the Source Control panel (left activity bar). Click the `+` next to each changed file to stage it (or use `Stage All`).
	- Enter a commit message like "Apply Docker stack and nginx/mariadb changes" and click the checkmark to commit.

6. Push your branch to your fork (origin):
	- In the status bar or Source Control view click `Publish Branch` (or use the `...` menu → `Push`). This creates the branch on GitHub under your fork.

7. Open a Pull Request if desired:
	- Use the GitHub web UI to open a PR from `feature/apply-docker-sample` into your fork's default branch, or merge locally if you prefer.

Notes:
- You can still use the integrated terminal for any commands missing from the UI (e.g., adding remotes or complex rebases). The UI covers clone, branch, stage/commit, push, and file operations.
- Copy operations can be done with the OS file manager or from another VS Code window (open both folders and drag files). After copying, refresh the Explorer to see new files.

You can now continue with step 2 (export SQL) below.

2) Export SQL from the existing site

- On the machine that hosts the current DB (or from a machine with access):

```bash
# export DB to SQL dump (example)
mysqldump -u <db_user> -p'<db_password>' --single-transaction --quick --lock-tables=false <db_name> > emap_dump.sql
```

Make `emap_dump.sql` available locally (download or scp). Keep it safe.

3) Prepare your fork locally and apply this sample

# Clone your fork (if not already done) and open it in VS Code (see step 1). Then copy the sample Docker/stack files from this sample repository into your fork. If you have this sample repo checked out locally at `~/dev/emap-sample`, adapt paths accordingly. Below commands assume the sample repo is at `../emap` (one directory up) — adjust as needed.

Files to copy from this sample into your fork:
- `docker-compose.yml`
- `Dockerfile` (app image)
- `docker/nginx/Dockerfile` and `docker/nginx/default.conf`
- `docker/db/Dockerfile` (MariaDB init copy of `sql/`)
- `entrypoint.sh` (app entrypoint which runs collectstatic & migrate)
- `sql/init.sql` (or your DB dump renamed to `sql/init.sql` to be used by MariaDB image)
- `landing_page/settings.py` changes shown in this sample (STATIC_ROOT, STATIC_URL, WhiteNoise, CSRF handling)
- `.env.sample` or create `.env.local` for Portainer

Exact copy commands (adjust sample path). Run these from your fork clone (you can run them in VS Code terminal):
```bash
# from inside your cloned fork repo
SAMPLE=../emap  # path to the sample repo

cp ${SAMPLE}/docker-compose.yml .
cp ${SAMPLE}/Dockerfile .
mkdir -p docker/nginx
cp ${SAMPLE}/docker/nginx/Dockerfile docker/nginx/
cp ${SAMPLE}/docker/nginx/default.conf docker/nginx/
mkdir -p docker/db
cp ${SAMPLE}/docker/db/Dockerfile docker/db/
cp ${SAMPLE}/entrypoint.sh .

# Copy the SQL init file into sql/ so MariaDB image picks it up on first start
mkdir -p sql
cp ${SAMPLE}/sql/init.sql sql/ 2>/dev/null || true

# Copy sample .env template
cp ${SAMPLE}/.env.sample .env.sample

# If your DB dump is the source of truth, add it to sql/ as init.sql if you want it loaded by image on first run
# WARNING: do NOT commit real credentials or large dumps to git; instead keep init.sql out of git or use a private repo.
# For local testing only:
# cp /path/to/emap_dump.sql sql/init.sql
```

If you prefer to include `emap_dump.sql` as an init file for the DB image, copy/rename it to `sql/init.sql`. Note: large SQL dumps are usually not committed—use a secure transfer and import via `docker exec` during deployment if needed.

4) Apply `landing_page/settings.py` adjustments

This sample made these necessary changes in `landing_page/settings.py`:
- `STATIC_URL = "/static/"` and `STATIC_ROOT = BASE_DIR / "staticfiles"`
- `STATICFILES_DIRS = [BASE_DIR / "static"]`
- WhiteNoise: `whitenoise.runserver_nostatic` in `INSTALLED_APPS` and `whitenoise.middleware.WhiteNoiseMiddleware` in `MIDDLEWARE`, and `STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"`
- Proxy/CSRF settings: `USE_X_FORWARDED_HOST = True`, `SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO","https")`, and `CSRF_TRUSTED_ORIGINS` read from env

Simplest path: replace your `landing_page/settings.py` with the `landing_page/settings.py` from the sample, or apply the same edits. Exact copy command:

```bash
cp ${SAMPLE}/landing_page/settings.py landing_page/settings.py
```

5) Commit and push changes to your fork

```bash
git add docker-compose.yml Dockerfile entrypoint.sh docker/nginx docker/db sql .env.sample landing_page/settings.py
git commit -m "Add Docker Compose + nginx + MariaDB init and settings from sample"
git push origin main
```

Replace `main` with your fork's default branch name if different.

6) Deploy in Portainer (Stacks)

- Open Portainer → Stacks → Add stack.
- Fill `Name` (e.g. `emap`).
- Choose "Repository" as the stack source and supply your fork's GitHub URL (e.g. `https://github.com/<you>/<your-repo>`). Optionally set branch.
- In the Stack options, upload your local env file (`.env.local` or paste env variables). Use the `.env.sample` as template and fill values. Required values include DB passwords, SECRET_KEY, ALLOWED_HOSTS, WEB_PORT, CSRF_TRUSTED_ORIGINS.
- Deploy the stack.

Notes about MariaDB init and SQL import
-------------------------------------
- If you copied `sql/init.sql` into the repo and the MariaDB Dockerfile copies `./sql/` into `/docker-entrypoint-initdb.d/`, the official MariaDB image will execute that SQL on first container creation. That is suitable for small initialization SQL.
- Large production dumps are better restored by importing into the running DB container after it is healthy. Example import (after stack is up):

```bash
# copy dump into db container and import
docker cp emap_dump.sql <db_container>:/tmp/emap_dump.sql
docker exec -i <db_container> sh -c 'exec mysql -u root -p"${DB_ROOT_PASSWORD}" ${DB_NAME}' < emap_dump.sql
```

7) Verify and test

- In Portainer, after stack deploy, view service logs for `app` and `nginx`.
- Ensure `CSRF_TRUSTED_ORIGINS` and `ALLOWED_HOSTS` match the hostnames you use to access the site.
- Test login and static files. If static files 404, ensure `collectstatic` ran and `staticfiles` are present in the `static-volume`.

Security note
-------------
- Do not commit secrets (passwords, long dumps) to the public repo. Use Portainer's env upload or a private repo.

Summary (one-liner per step)
----------------------------
1. Fork repo on GitHub.
2. Dump DB: `mysqldump`.
3. Clone fork, copy sample Dockerfiles/compose/entrypoint/sql/settings from this sample into your fork.
4. Commit & push.
5. In Portainer: Stacks → Add stack → Repository: `github.com/<you>/<your-repo>` → upload env file → Deploy.

If you want, I can also:
- Generate a small script (`apply-sample.sh`) that copies the exact files from a local path to your fork clone and commits them (automates step 3/4).
- Generate a short Portainer-ready `.env.local` template with your values filled in (you would provide the secrets). Which do you prefer?
