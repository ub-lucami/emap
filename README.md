Content Image Recall app
===============================================
Repository for application which will test whether the content of the image influences if a person remembers it or not.




1) Deploy in Portainer (Stacks)

- Open Portainer → Stacks → Add stack.
- Fill `Name` (e.g. `emap`).
- Choose "Repository" as the stack source and supply your fork's GitHub URL (e.g. `https://github.com/<you>/<your-repo>`). Optionally set branch.
- In the Stack options, upload your local env file (`.env` or paste env variables, see instruction below). 
- Deploy the stack.

2) Provide environment variables for Stack. 
    You may use the `./.env` file and upload its content to Portainer when required.
    Use the `./.env.sample` as template and fill values. Required values include DB passwords, SECRET_KEY, ALLOWED_HOSTS, WEB_PORT, CSRF_TRUSTED_ORIGINS.
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

Hint
-----------
- This content also serves as instructions for generic Django app deployment using Portainer Stacks (see [MIGRATE_TO_PORTAINER.md](MIGRATE_TO_PORTAINER.md))
