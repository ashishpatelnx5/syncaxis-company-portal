# Deployment

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
| `VITE_WEBMAIL_URL` | Webmail quick link | `https://webmail.syncaxis.com/` |
| `VITE_ERP_URL` | ERP quick link | `http://erp.syncaxis.com/login` |
| `VITE_GREYTHR_URL` | GreytHR quick link | `https://syncaxis.greythr.com/` |
| `VITE_INQUIRY_URL` | Inquiry portal quick link | `https://inquiry.syncaxis.com/` |

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

There is no backend — Admin edits (add/update/delete employee or
department, photo uploads) save to that browser's `localStorage` only.
Use the **Export employees.js** / **Export departments.js** buttons on
the Admin/Departments pages to download an updated data file, commit
it to `src/data/`, and redeploy so the change ships to everyone.
