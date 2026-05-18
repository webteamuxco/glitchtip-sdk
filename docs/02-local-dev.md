# 2. Local environment (Docker)

To test the integration without touching shared infra, the SDK ships a **Docker Compose** stack that boots GlitchTip on `http://localhost:8000` and auto-provisions a project + DSN.

> Requires Docker Desktop (or `docker-compose-plugin`). ~600 MB RAM idle.

## 2.1 First start

From inside the consuming project:

```bash
pnpm dlx @webteamuxco/glitchtip-sdk dev:up
```

What the command does:

1. Checks that `docker compose` is available
2. Runs migrations (one-shot container)
3. Starts `postgres`, `redis`, `web`, `worker`
4. Waits for <http://localhost:8000> to be healthy (2 min timeout)
5. **Prompts interactively** for: admin email, password, org name, project name
6. Calls the GlitchTip API to create user/org/team/project and fetch the DSN
7. Writes `GLITCHTIP_DSN=...` into `.env.local` (or `.env` if `.env.local` is missing)

When it returns:

- The UI is reachable on **http://localhost:8000** with the credentials you just created
- `GLITCHTIP_DSN` is available for your app

## 2.2 Custom port

```bash
GLITCHTIP_PORT=8100 pnpm dlx @webteamuxco/glitchtip-sdk dev:up
```

## 2.3 If auto-provisioning fails

The CLI prints a manual fallback:

1. Open <http://localhost:8000>
2. Create an account
3. Create an organization and a project
4. Copy the DSN shown in the UI and paste it into `.env`:

```bash
GLITCHTIP_DSN=http://xxxxxxxxxxxxxxxx@localhost:8000/1
```

## 2.4 Lifecycle

```bash
pnpm dlx @webteamuxco/glitchtip-sdk dev:logs   # tail web + worker
pnpm dlx @webteamuxco/glitchtip-sdk dev:down   # stop (data volumes are kept)
pnpm dlx @webteamuxco/glitchtip-sdk dev:reset  # ⚠️ destroys volumes (events, users, projects)
```

## 2.5 Use case — switching projects during dev

To point several local apps at the same GlitchTip instance but different projects:

1. Open the UI → create a second project
2. Copy the second project's DSN
3. Drop it into the other app's `.env`

The Docker instance is not project-scoped — a single `dev:up` covers all your local apps.

## 2.6 Use case — CI / integration tests

The compose file lives at `node_modules/@webteamuxco/glitchtip-sdk/templates/docker-compose.glitchtip.yml`. To start the stack in CI without the interactive wizard:

```bash
docker compose -f node_modules/@webteamuxco/glitchtip-sdk/templates/docker-compose.glitchtip.yml up -d
# wait until http://localhost:8000 responds, then provision via the API
```

> For pure CI it's often simpler to use a dedicated GlitchTip project (staging) instead of spinning up Docker on every run.
