MIGRATE AN EXISTING DJANGO (single Docker with external DB) TO A DOCKER STACK (Portainer)
===============================================

Goal
----
Fork an existing Python/Django repo (the "python single Docker" repo you own), apply the Docker stack + MariaDB + nginx changes from this sample repository, include an SQL init file (init.sql), and deploy the fork using Portainer Stacks.

This document provides exact commands and brief explanations.

Assumptions
-----------
- You have a GitHub account and can fork repositories.
- You have a local machine with this sample repo checked out (the files you want to copy from).
- You have VS Code set up for GitHub
- You have terminal access to the existing Django app including `mysqldump` and file access.
- You have access to Portainer's "Stacks" UI to deploy from the forked repo by pointing at GitGub URL and uploading the environment from a local copy of .env file.

High-level steps
-----------------
1. Fork the target repo on GitHub (the repo you have access to that currently runs python single Docker).
2. Export (dump) the existing site's SQL data from the current DB.
3. Clone your fork locally and add/edit the configuration files including SQL database dump.
4. Commit and push the changes to your fork.
5. In Portainer: Stacks → Add stack 
    - Repository: `<your fork URL/>` 
    - Upload `.env` file 
    - Deploy.

Detailed commands (exact)
------------------------

1) Export SQL from the existing site

    - On the machine that hosts the current DB (or from a machine with access):

        ```bash
        # export DB to SQL dump (example)
        mysqldump -u <db_user> -p'<db_password>' --single-transaction --quick --lock-tables=false <db_name> > init.sql
        ```

    - Make `init.sql` available locally (download or scp). Keep it safe. This will be the source of your initial database for your docker-compose stack. 

2) Fork on GitHub (use GitHub web)

    - In your browser open the upstream repository (the one you currently run) and click **Fork** → choose your GitHub account. This creates `github.com/<you>/<your-repo>`.
    - Open your fork in the web UI and confirm files are visible. Optionally change the default branch name or repository settings as you prefer.

3) Adapt the fork with VS Code (Git UI) and deploy the changes

    Use VS Code's built-in Git support and Explorer to work with your fork without `cmd`. Brief GUI steps:

    3.1 Clone your fork via VS Code:
	- Open VS Code. Press Ctrl+Shift+P (Cmd+Shift+P on macOS) → `Git: Clone` → paste your fork URL (`https://github.com/<you>/<your-repo>.git` or SSH URL).
	- When prompted, choose a local folder and open the repository in VS Code.

    3.2 Introduce updates to your fork using VS Code Explorer:
	- In VS Code's Explorer view, create/modify files from your local sample checkout (or use your OS file manager). 
        - Files to add from this sample: `./docker-compose.yml`, `./docker/nginx/Dockerfile`, `./docker/nginx/default.conf` `./docker/db/Dockerfile`, `./entrypoint.sh`, `./.env.sample`
        - Files to modify: `./Dockerfile`, `./requirements.txt`, `./landing_page/settings.py`, `emapp/views.py`
        - Files to add from your source: `./sql/init.sql`
        - Files to create from sample: `./.env`

        Sample cloned app tree indicating new and changed files: 

        ```tree
        emap/
        ├── docker-compose.yml          🆕 new          (see content below)
        ├── Dockerfile                  ♻️ changed      (see changes below)   
        ├── entrypoint.sh               🆕 new          (see content below)
        ├── .env.sample                 🆕 new
        ├── requirements.txt            ♻️ changed      (see additions below)   
        ├── README.md                   🟡 not relevant (general manual)
        ├── MIGRATE_TO_PORTAINER.md     🟡 not relevant (migration to stack manual)              
        ├── .dockerignore                                (verify, prevent access to secrets via Docker)              
        ├── .gitignore                                   (verify, prevent access to secrets via Git)                      
        ├── docker/                     🆕 new folder
        │   ├── nginx/                  🆕 new folder
        │   │   ├── Dockerfile          🆕 new          (see content below)
        │   │   └── default.conf        🆕 new          (see content below)
        │   └── db/                     🆕 new folder
        │       └── Dockerfile          🆕 new          (see content below)
        ├── sql/                        🆕 new folder
        │   └── init.sql                🆕 new          (see content below)
        ├── landing_page/
        │   └── settings.py             ♻️ changed      (see changes below)
        ├── emapp/
        │   ├── __init__.py
        │   ├── admin.py
        │   ├── apps.py
        │   ├── forms.py
        │   ├── models.py
        │   ├── views.py
        │   ├── tests.py
        │   ├── urls.py
        │   ├── utils.py
        │   └── migrations/
        └── templates/
            └── emapp/
                ├── app.html
                ├── edit_data.html
                ├── generate_users.html
                ├── landing_page.html
                └── registration/
                    └── login.html
        ```

        NEW: create or copy sample ``./docker-compose.yml`` (explanation in comments)
        ```yaml
        # define services = individual Docker containers to be used within stack
        services:
        # this one is for MariaDB
        db:
            build:
            context: .
            dockerfile: docker/db/Dockerfile # Dockerfile adds additiona layer with initial database to MariaDB image
            image: emap-mariadb:10.6
            container_name: emap-db
            restart: always
            environment:
            MARIADB_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
            MARIADB_DATABASE: ${DB_NAME}
            MARIADB_USER: ${DB_USER}
            MARIADB_PASSWORD: ${DB_PASSWORD}
            MARIADB_AUTO_UPGRADE: '1'  # Recreates internal healthcheck user if needed
            volumes:
            - db-data:/var/lib/mysql
            healthcheck:
            test: ["CMD", "/usr/local/bin/healthcheck.sh", "--connect", "--innodb_initialized"]
            start_period: 60s   # Wait 60s before first check (critical for init.sql)
            interval: 30s
            timeout: 10s
            retries: 10         # Total wait up to ~6 minutes
        # this refers to original Django app
        app:
            build: .
            container_name: emap-app
            restart: always
            depends_on:
            db:
                condition: service_healthy
            environment:
            DB_HOST: db
            DB_PORT: 3306
            DB_NAME: ${DB_NAME}
            DB_USER: ${DB_USER}
            DB_PASSWORD: ${DB_PASSWORD}
            SECRET_KEY: ${SECRET_KEY}
            ALLOWED_HOSTS: ${ALLOWED_HOSTS}
            CSRF_TRUSTED_ORIGINS: ${CSRF_TRUSTED_ORIGINS}
            DEBUG: ${DEBUG}
            LANGUAGE_CODE: ${LANGUAGE_CODE}
            TIME_ZONE: ${TIME_ZONE}
            DB_ENGINE: ${DB_ENGINE} 
            volumes:
            - static-volume:/app/staticfiles
            - media-volume:/app/media
            # Do not publish the app port to host; nginx will expose port 80.
            # At container start the image entrypoint will collect static files,
            # apply migrations and start gunicorn (see `/app/entrypoint.sh`).
        # this is for the reverse proxy
        nginx:
            build:
            context: ./docker/nginx
            dockerfile: Dockerfile
            image: emap-nginx:latest
            container_name: emap-nginx
            restart: always
            depends_on:
            app:
                condition: service_started
            ports:
            - "${WEB_PORT}:80"
            volumes:
            - static-volume:/usr/share/nginx/html/static:ro
            - media-volume:/usr/share/nginx/html/media:ro
        # define persistent storage for database and media files (these will not dissapear on container restart)
        volumes:
            db-data:
            static-volume:
            media-volume:
            # nginx service will be configured to serve static and media files and to proxy towards the app
        ```
        
        EDIT: ``./Dockerfile`` (In app's Dockerfile make sure to remove runserver and start Django with production-ready Gunicorn)
        ```diff
         # Dockerfile
         #
         # Provide and install an entrypoint script that will collect static files and
         # run migrations at container start time (safer than build-time collection
         # because runtime env vars are available).
        +COPY entrypoint.sh /app/entrypoint.sh
        +RUN chmod +x /app/entrypoint.sh

         # Run Django server - remove this command
        -CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
         # Run application with gunicorn (production-ready WSGI server)
        +ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
        ```

        NEW: create or copy sample ``./entrypoint.sh`` (collects static files and run gunicorn on startup)
        ```sh
        #!/bin/sh
        set -e

        # Ensure static root exists to avoid WhiteNoise warning during startup
        mkdir -p /app/staticfiles

        # Collect static files into STATIC_ROOT
        echo "Collecting static files..."
        python manage.py collectstatic --noinput

        # Apply database migrations
        echo "Applying database migrations..."
        python manage.py migrate --noinput

        # Launch Gunicorn
        echo "Starting gunicorn..."
        exec gunicorn landing_page.wsgi:application --bind 0.0.0.0:8000 --workers 3
        ```

        EDIT: ``./requirements.txt`` (Add two new libraries for production server)
        ```diff
        openpyxl==3.1.5
        pandas==2.2.3
        numpy==2.2.3
        +whitenoise==6.5.0
        +gunicorn==20.1.0
        ```

        NEW: create or copy sample ``./docker/nginx/Dockerfile`` for reverse proxy creation (this Dockerfile will provide configuration file to the image)
        ```dockerfile
        FROM nginx:stable-alpine

        # Copy the repo nginx config into the image so no host mount or Docker Config
        # is required. Build context for this service will be `./docker/nginx`.
        COPY default.conf /etc/nginx/conf.d/default.conf

        RUN chmod 644 /etc/nginx/conf.d/default.conf || true

        EXPOSE 80

        CMD ["nginx", "-g", "daemon off;"]

        ```

        NEW: create or copy sample ``./docker/nginx/default.conf`` for reverse proxy configuration
        ```nginx
        upstream app_server {
            server app:8000;
        }

        server {
            listen 80;
            server_name _;

            # Serve static files
            location /static/ {
                alias /usr/share/nginx/html/static/;
                access_log off;
                expires 30d;
            }

            # Serve media files
            location /media/ {
                alias /usr/share/nginx/html/media/;
                access_log off;
                expires 30d;
            }

            # Proxy pass to the Django app
            location / {
                # Forward original host (including port), client IP and scheme so
                # Django can validate CSRF and construct correct absolute URLs.
                proxy_set_header Host $http_host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
                proxy_set_header X-Forwarded-Host $host;
                # Do not cache responses to requests that include cookies (authenticated users)
                # or for specific dynamic endpoints (login/logout/admin).
                proxy_no_cache $http_cookie $cookie_session;
                proxy_cache_bypass $http_cookie $cookie_session;

                # Prevent intermediate caching of dynamic responses
                add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate" always;
                add_header Pragma "no-cache" always;

                proxy_pass http://app_server;
            }

            # Ensure login/logout/admin are always proxied without caching
            location ~* ^/(login|logout|admin|accounts)/ {
                proxy_set_header Host $http_host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
                proxy_set_header X-Forwarded-Host $host;
                proxy_no_cache 1;
                proxy_cache_bypass 1;
                add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate" always;
                add_header Pragma "no-cache" always;
                proxy_pass http://app_server;
            }
        }
        ```
        NEW: create or copy sample ``./docker/db/Dockerfile`` (this Dockerfile will provide configuration file to the image)
        ```dockerfile
        FROM mariadb:10.6

        # Copy repository SQL init scripts into the image so they are available
        # to the official MariaDB entrypoint on first startup. Using build context
        # = project root (set in compose: build.context: .) so ./sql is available.
        COPY ./sql/ /docker-entrypoint-initdb.d/
        
        # Ensure files are readable
        RUN chmod -R a+r /docker-entrypoint-initdb.d || true
        
        # Keep default entrypoint/cmd from base image
        ```

        EDIT: ``./emapp/views.py`` (force new login on landing page - add force logout after line 25)
        ```diff
         def landing_page(request):
         log.info("Landing page accessed")
        +# Always log out any authenticated user when arriving at the landing page
        +try:
        +    if request.user.is_authenticated:
        +        log.info(f"Logging out user {request.user.username} on landing page access")
        +        logout(request)
        +except Exception as e:
        +    log.error(f"Error logging out user on landing page: {e}")

         return render(request, "emapp/landing_page.html")
        ```

        EDIT ``./landing_page/settings.py`` (required changes)

        Here are the necessary changes in `landing_page/settings.py`:
        - `STATIC_URL = "/static/"` and `STATIC_ROOT = BASE_DIR / "staticfiles"`
        - `STATICFILES_DIRS = [BASE_DIR / "static"]`
        - WhiteNoise: `whitenoise.runserver_nostatic` in `INSTALLED_APPS` and `whitenoise.middleware.WhiteNoiseMiddleware` in `MIDDLEWARE`, and `STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"`
        - Proxy/CSRF settings: `USE_X_FORWARDED_HOST = True`, `SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO","https")`, and `CSRF_TRUSTED_ORIGINS` read from `.env`

        ```diff
         INSTALLED_APPS = [
             "emapp.apps.EmappConfig",
        +    "whitenoise.runserver_nostatic",
             "django.contrib.admin",
             "django.contrib.auth",
             "django.contrib.contenttypes",
         @@ -45,6 +46,7 @@

         MIDDLEWARE = [
             "django.middleware.security.SecurityMiddleware",
        +    "whitenoise.middleware.WhiteNoiseMiddleware",
             "django.contrib.sessions.middleware.SessionMiddleware",
             "django.middleware.common.CommonMiddleware",
             "django.middleware.csrf.CsrfViewMiddleware",
         @@ -83,8 +85,8 @@
                 'NAME': config('DB_NAME'),
                 'USER': config('DB_USER'),
                 'PASSWORD': config('DB_PASSWORD'),
        -        'HOST': config('DB_HOST'),
        -        'PORT': config('DB_PORT'),
        +        'HOST': config('DB_HOST', default='db'),
        +        'PORT': config('DB_PORT', default='3306'),
             }
         }

         @@ -122,13 +124,39 @@
         # Static files (CSS, JavaScript, Images)
         # https://docs.djangoproject.com/en/5.1/howto/static-files/

        -STATIC_URL = "static/"
        +# URL prefix for static files. Use a leading slash so URLs are absolute.
        +STATIC_URL = "/static/"

         # During development static files are served from the `static/` folder
         STATICFILES_DIRS = [
             BASE_DIR / "static",
         ]

        +# Directory where `collectstatic` will collect static files for production.
        +# Run `python manage.py collectstatic` and configure your web server to serve
        +# the files from this folder when DEBUG=False.
        +STATIC_ROOT = BASE_DIR / "staticfiles"
		+
        +# Use WhiteNoise storage to serve compressed static files with hashed names
        +# If you run into ManifestStaticFilesStorage errors during `collectstatic`,
        +# try `whitenoise.storage.CompressedStaticFilesStorage` instead.
        +STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
		+
         # Default primary key field type
         # https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

         DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

        +# When running behind a reverse proxy (nginx) ensure Django handles
        +# forwarded host/scheme correctly and that trusted origins are configured
        +# for CSRF checks. Set `CSRF_TRUSTED_ORIGINS` in your `.env`, e.g.
        +# CSRF_TRUSTED_ORIGINS=http://192.168.1.50
        +USE_X_FORWARDED_HOST = True
		+
        +# If you terminate TLS at the proxy and communicate with Django over HTTP,
        +# set the following to let Django detect HTTPS requests from X-Forwarded-Proto.
        +SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
		+
        +# Read CSRF_TRUSTED_ORIGINS from env (comma-separated). For Django 4+ include
        +# scheme (http/https), e.g. 'http://192.168.1.50' or 'https://example.com'.
        +CSRF_TRUSTED_ORIGINS = [v for v in config('CSRF_TRUSTED_ORIGINS', default='').split(',') if v]
        ```

        NEW: create `./.env`. Use the `./.env.sample` as template and fill values. Required values include DB passwords, SECRET_KEY, ALLOWED_HOSTS, WEB_PORT, CSRF_TRUSTED_ORIGINS.
        ```ini
        # Example environment file (DO NOT commit real secrets to GitHub/Docker Hub)
        # Copy this to `.env` or use as a template in Portainer when creating the stack.

        # External web port (host)
        WEB_PORT=8001

        # Database
        DB_ROOT_PASSWORD=changeme_root_password
        DB_NAME=emapp
        DB_USER=emapp_user
        DB_PASSWORD=changeme_db_password

        # Django
        SECRET_KEY=replace-with-a-long-random-secret
        # Comma-separated list of allowed hosts (no spaces)
        ALLOWED_HOSTS=localhost,127.0.0.1,hostname.domain
        DEBUG=False
        DB_ENGINE=django.db.backends.mysql
        LANGUAGE_CODE=en
        TIME_ZONE=Europe/Ljubljana

        # CSRF trusted origins (include scheme and port if nonstandard)
        # e.g. CSRF_TRUSTED_ORIGINS=http://docker-alpine.lucami.org:8001
        CSRF_TRUSTED_ORIGINS=localhost:8001,127.0.0.1:8001,hostname.domain:8001
        ```
        
    3.3 Stage and commit changes in the Source Control view:
        - Open the Source Control panel (left activity bar). Click the `+` next to each changed file to stage it (or use `Stage All`).
        - Enter a commit message like "Apply Docker stack and nginx/mariadb changes" (you may autogenerate the commit message by clicking on icon to its right) and click the checkmark to commit.
        - Click on 

    3.4 Push your branch to your fork (origin):
        - In the status bar or Source Control view click `Publish Branch` (or use the `...` menu → `Push`). This creates the branch on GitHub under your fork.

    3.5 Open a Pull Request if desired:
        - Use the GitHub web UI to open a PR from `feature/apply-docker-sample` into your fork's default branch, or merge locally if you prefer.

    Notes:
    - You can still use the integrated terminal for any commands missing from the UI (e.g., adding remotes or complex rebases). The UI covers clone, branch, stage/commit, push, and file operations.
    - Copy operations can be done with the OS file manager or from another VS Code window (open both folders and drag files). After copying, refresh the Explorer to see new files.

4) Deploy in Portainer (Stacks)

- Open Portainer → Stacks → Add stack.
- Fill `Name` (e.g. `emap`).
- Choose "Repository" as the stack source and supply your fork's GitHub URL (e.g. `https://github.com/<you>/<your-repo>`). Optionally set branch.
- In the Stack options, upload your local env file (`.env` or paste env variables). 
- Deploy the stack.

5) Verify and test

- In Portainer, after stack deploy, view service logs for `app` and `nginx`.
- Ensure `CSRF_TRUSTED_ORIGINS` and `ALLOWED_HOSTS` match the hostnames you use to access the site.
- Test login and static files. If static files 404, ensure `collectstatic` ran and `staticfiles` are present in the `static-volume`.

Security note
-------------
- Do not commit secrets (passwords, long dumps) to the public repo. Use Portainer's env upload or a private repo.

Summary
----------------------------
1. Fork repo on GitHub.
2. Dump DB: `MariaDB`.
3. Clone fork, edit and copy samples into your fork.
4. Commit & push.
5. In Portainer: Stacks → Add stack → Repository: `github.com/<you>/<your-repo>` → upload env file → Deploy.


