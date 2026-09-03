# Deployment

## Architecture

Three pieces, all needed together:

1. **Frontend** (this repo's root) — a static React/Vite single-page app.
2. **Backend API** (`server/`) — a small Node/Express app that the frontend
   calls for login and all employee/department data. It's the only thing
   that talks to SQL Server; the browser never connects to the database
   directly.
3. **SQL Server database** — `SYNCAXIS_PORTAL`, created by the scripts in
   `database/`.

## Database setup

Run once, in SSMS, against the SQL Server instance:

1. Connect as a sysadmin (e.g. `sa`, or your Windows admin login), open a
   new query window targeting the `master` database, and run
   [`database/01_create_database_and_login.sql`](database/01_create_database_and_login.sql).
   This creates the `SYNCAXIS_PORTAL` database and a dedicated SQL login
   (`syncaxis_portal_app`) the backend connects as. **Edit the password in
   that script before running it** (and use the same value for `DB_PASSWORD`
   below) — don't ship the placeholder.
   - Requires "SQL Server and Windows Authentication mode" (mixed mode) to
     be enabled on the instance. Server Properties → Security → Server
     authentication in SSMS; restart the SQL Server service after changing
     it.
2. Switch the query window's database to `SYNCAXIS_PORTAL` and run
   [`database/02_schema.sql`](database/02_schema.sql). This creates the
   `portal` schema, its tables (`Departments`, `Employees`,
   `EmployeeDepartments`, `Users`), indexes, `UpdatedAt` triggers, and a
   `portal.EmployeeDirectory` view — and grants the app login access scoped
   to that one schema only (not the whole database).

## Backend API setup

```bash
cd server
cp .env.example .env    # then fill in DB_PASSWORD, JWT_SECRET, etc.
npm install
npm run seed             # loads the existing employees/departments and
                          # creates the first admin login (SEED_ADMIN_USERNAME
                          # / SEED_ADMIN_PASSWORD in server/.env) — safe to
                          # re-run; only seeds employees/departments once.
npm run dev               # dev, restarts on file changes
# or: npm start            # production
```

`DB_SERVER` supports a named instance as `HOST\INSTANCE` (e.g.
`SYNCAXIS-SERVER\SQLEXPRESS`) — this requires the **SQL Server Browser**
Windows service to be running on that machine so the instance name can
resolve; otherwise use `HOST,PORT` or plain `HOST`.

For production, run the backend as a persistent service (e.g. via
[NSSM](https://nssm.cc/) or `pm2`) rather than a foreground terminal, and
set `VITE_API_URL` (below) to wherever it's actually reachable — `localhost`
only works when the frontend and backend run on the same machine.

## Build

```bash
npm run build     # outputs static files to dist/
npm run preview   # serve that build locally, for a final check before deploying
```

`dist/` is a fully static site — any static file host works. The one
thing every host needs to be configured for is described below under
[SPA routing](#spa-routing).

### Quick option: `npm start`

For standing the app up on a server without setting up Nginx/IIS/etc.
(e.g. a Windows Server box), `npm start` builds fresh and serves the
result on `0.0.0.0` (reachable from other machines on the network, not
just localhost) on the port set by `VITE_PORT`:

```bash
npm start
```

This uses `vite preview`, which is fine for internal/small-scale use
but isn't a hardened production server (no gzip, no caching headers,
no TLS) — for anything internet-facing or higher-traffic, prefer one
of the real web servers below.

## Environment variables

See `.env.example` for the full list. All variables are prefixed
`VITE_` (required for Vite to expose them to client code) and every
one has a fallback baked into the source, so the app still runs
without a `.env` file at all:

| Variable | Used for | Fallback |
|---|---|---|
| `VITE_PORT` | dev/preview server port | `5173` |
| `VITE_API_URL` | Backend API base URL (see `server/`) | `http://localhost:4000` |
| `VITE_WEBMAIL_URL` | Webmail quick link | `https://webmail.syncaxis.com/` |
| `VITE_ERP_URL` | ERP quick link | `http://erp.syncaxis.com/login` |
| `VITE_GREYTHR_URL` | GreytHR quick link | `https://syncaxis.greythr.com/` |
| `VITE_INQUIRY_URL` | Inquiry portal quick link | `https://inquiry.syncaxis.com/` |

See `server/.env.example` for the backend's own variables (database
connection, JWT secret, CORS origin).

**Vite inlines these at build time**, not at server runtime — a
hosting platform's "environment variables" setting only takes effect
if it runs `npm run build` itself (which is how Netlify, Vercel, and
most CI-based hosts work). If you instead build locally and upload the
`dist/` folder, set `.env` before running `npm run build` locally.

## SPA routing

This app uses client-side routing (React Router), so the host must
serve `index.html` for *every* path (`/directory`, `/employee/12`,
`/admin`, ...), not just `/`. Without that, refreshing or
directly opening a link to any page other than the homepage 404s.
Each platform calls this something slightly different:

### Netlify
Add a `netlify.toml` at the repo root:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```
Set any `VITE_*` overrides under Site settings → Environment variables.

### Vercel
Add a `vercel.json` at the repo root:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
Vercel auto-detects the Vite build command/output; set `VITE_*`
overrides under Project Settings → Environment Variables.

### GitHub Pages
GitHub Pages has no server-side rewrite support, so a direct link to
`/directory` will 404 unless you add the classic SPA workaround:
copy `dist/index.html` to `dist/404.html` after building (Pages serves
`404.html` for any unmatched path, which re-loads the app and lets
React Router take over). Also set `base` in `vite.config.js` to your
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
