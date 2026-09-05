# Deployment

## Layout

The repo root only holds the two things you need to run the app —
**start.bat** and **stop.bat** — plus this README. Everything else
(source code, config, the database scripts) lives under **app/**:

```
syncaxis-company-portal/
├── start.bat / stop.bat   ← double-click these
├── README.md
└── app/
    ├── src/               (frontend — React/Vite)
    ├── server/            (backend — Node/Express + SQL Server)
    ├── database/          (SQL setup/migration scripts)
    ├── scripts/           (start.ps1 / stop.ps1 — what the .bat files call)
    ├── package.json       (frontend)
    └── server/package.json (backend)
```

## Architecture

Two pieces, both needed:

1. **App service** — one Node/Express process (`app/server/`) that does
   two jobs: it's the only thing that talks to SQL Server (login and all
   employee/department data go through it — the browser never connects to
   the database directly), and it serves the built frontend (`app/dist/`,
   built from `app/src/`) on that same port. One process, one port to run
   and open on a firewall.
2. **SQL Server database** — `SYNCAXIS_PORTAL`, created by the scripts in
   `app/database/`.

The frontend and backend are still separate npm projects (`app/` vs.
`app/server/`) since they have different dependencies, but in normal use
you only ever run the one combined service — see
[app/scripts/start.ps1](scripts/start.ps1).

## Database setup

Run once, in SSMS, against the SQL Server instance:

1. Connect as a sysadmin (e.g. `sa`, or your Windows admin login), open a
   new query window targeting the `master` database, and run
   [`app/database/01_create_database_and_login.sql`](database/01_create_database_and_login.sql).
   This creates the `SYNCAXIS_PORTAL` database and a dedicated SQL login
   (`syncaxis_portal_app`) the backend connects as. **Edit the password in
   that script before running it** (and use the same value for `DB_PASSWORD`
   below) — don't ship the placeholder.
   - Requires "SQL Server and Windows Authentication mode" (mixed mode) to
     be enabled on the instance. Server Properties → Security → Server
     authentication in SSMS; restart the SQL Server service after changing
     it.
2. Switch the query window's database to `SYNCAXIS_PORTAL` and run
   [`app/database/02_schema.sql`](database/02_schema.sql). This creates the
   `portal` schema and its tables, indexes, `UpdatedAt` triggers, and a
   `portal.EmployeeDirectory` view — and grants the app login access scoped
   to that one schema only (not the whole database). This script is meant
   for a brand-new database and always reflects the current full schema.
3. If the database already exists from an earlier version of the app,
   instead run whichever of `app/database/03_*.sql`, `04_*.sql`, `05_*.sql`
   you haven't applied yet, in order — each is a small, safe-to-re-run
   migration for one feature added after the initial schema.

## Backend API setup

```bash
cd app/server
cp .env.example .env    # then fill in DB_PASSWORD, JWT_SECRET, etc.
npm install
npm run seed             # loads the existing employees/departments and
                          # creates the first admin login (SEED_ADMIN_USERNAME
                          # / SEED_ADMIN_PASSWORD in app/server/.env) — safe to
                          # re-run; only seeds employees/departments once.
```

`DB_SERVER` supports a named instance as `HOST\INSTANCE` (e.g.
`SYNCAXIS-SERVER\SQLEXPRESS`) — this requires the **SQL Server Browser**
Windows service to be running on that machine so the instance name can
resolve; otherwise use `HOST,PORT` or plain `HOST`.

## Running the app

The easiest way, on Windows: double-click **start.bat** at the repo root.
It builds the frontend fresh and starts the backend, which serves both the
API and the built frontend on one port (`PORT` in `app/server/.env`,
default `8050`) — open `http://localhost:8050` (or the server's actual
hostname/IP) in a browser. **stop.bat** stops it. See
[app/scripts/start.ps1](scripts/start.ps1) for what it actually does — it's
a thin wrapper around `npm run build` (in `app/`) and `npm start` (in
`app/server/`).

For a persistent install (survives a reboot, doesn't need a logged-in
session), run `app/server/`'s `npm start` under a service manager instead
of via the scripts above — e.g. [NSSM](https://nssm.cc/) or `pm2`.

### Developing with hot reload

For active frontend development, run the frontend and backend as two
separate processes instead of the combined single-service flow above:

```bash
cd app && npm run dev        # Vite dev server with hot reload (VITE_PORT, default 5173)
cd app && npm run server     # backend, restarts on file changes (PORT, default 8050)
```

In this mode, set `VITE_API_URL=http://localhost:8050` (or wherever the
backend is running) in `app/.env` so the dev server's API calls reach it —
by default (unset) API calls go to the same origin the page loaded from,
which is only correct once the backend is serving the built frontend
itself. Keep `VITE_PORT` different from the backend's `PORT` so the two
dev processes don't fight over the same port.

## Environment variables

See `app/.env.example` for the full list. All variables are prefixed
`VITE_` (required for Vite to expose them to client code) and every
one has a fallback baked into the source, so the app still runs
without a `.env` file at all:

| Variable | Used for | Fallback |
|---|---|---|
| `VITE_PORT` | dev server port (only used by `npm run dev`) | `5173` |
| `VITE_API_URL` | Backend API base URL — only set this if the frontend is deployed separately from the backend (see [Developing with hot reload](#developing-with-hot-reload)) | same origin as the page (correct once the backend serves the built frontend) |
| `VITE_WEBMAIL_URL` | Webmail quick link | `https://webmail.syncaxis.com/` |
| `VITE_ERP_URL` | ERP quick link | `http://erp.syncaxis.com/login` |
| `VITE_ERP_DASHBOARD_URL` | ERP Dashboard quick link | `http://192.168.3.9:8055/` |
| `VITE_GREYTHR_URL` | GreytHR quick link | `https://syncaxis.greythr.com/` |
| `VITE_INQUIRY_URL` | Inquiry portal quick link | `https://inquiry.syncaxis.com/` |

See `app/server/.env.example` for the backend's own variables (database
connection, JWT secret, CORS origin).

**Vite inlines these at build time**, not at server runtime — a
hosting platform's "environment variables" setting only takes effect
if it runs `npm run build` itself (which is how Netlify, Vercel, and
most CI-based hosts work). If you instead build locally and upload the
`app/dist/` folder, set `app/.env` before running `npm run build` locally.

## SPA routing (only if deploying the frontend separately)

The backend's own `express.static` + fallback route (see
[app/server/src/app.js](server/src/app.js)) already handles this for the
normal single-service setup above — nothing to configure. This section
only applies if you deploy the frontend (`app/dist/`) to a separate static
host instead, calling out to the backend via `VITE_API_URL`.

This app uses client-side routing (React Router), so that host must
serve `index.html` for *every* path (`/directory`, `/employee/12`,
`/admin`, ...), not just `/`. Without that, refreshing or
directly opening a link to any page other than the homepage 404s.
Each platform calls this something slightly different. Since the buildable
frontend project lives in `app/` (not the repo root), point the host's
**base/root directory** setting at `app/` first.

### Netlify
Add a `netlify.toml` inside `app/`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```
Set Site settings → Build & deploy → **Base directory** to `app`. Set any
`VITE_*` overrides under Site settings → Environment variables.

### Vercel
Add a `vercel.json` inside `app/`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
Set Project Settings → **Root Directory** to `app`. Vercel auto-detects the
Vite build command/output; set `VITE_*` overrides under Project Settings →
Environment Variables.

### GitHub Pages
GitHub Pages has no server-side rewrite support, so a direct link to
`/directory` will 404 unless you add the classic SPA workaround:
copy `app/dist/index.html` to `app/dist/404.html` after building (Pages
serves `404.html` for any unmatched path, which re-loads the app and lets
React Router take over). Also set `base` in `app/vite.config.js` to your
repo name (e.g. `base: '/syncaxis-company-portal/'`) if deploying to
`https://<user>.github.io/<repo>/` rather than a custom domain.

### Nginx
```nginx
location / {
  try_files $uri /index.html;
}
```

### Apache (.htaccess)
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### IIS (web.config)
```xml
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="SPA fallback" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

### Any other static host (S3, Cloudflare Pages, etc.)
Look for a setting called "SPA mode," "single-page app," "error
document," or "custom 404" and point it at `index.html`.

## Admin data after deploying

Admin edits (add/update/delete employee or department, photo uploads,
reporting lines) go straight to SQL Server through the backend API, so
they're visible to everyone immediately — no export/commit/redeploy step
needed. The **Export employees.js** / **Export departments.js** buttons on
the Admin/Departments pages still work, but now they're just an optional
manual backup (a snapshot you could restore from if needed), not the
primary way changes get saved.
