# Syncaxis Company Portal

A React + Vite single-page app: employee directory, org chart, an
admin area for managing employees/departments, and quick links to
company applications (webmail, ERP, GreytHR, inquiry portal).

There is no backend — see [DEPLOYMENT.md](DEPLOYMENT.md#admin-data-after-deploying)
for how Admin edits are stored and shared.

## Local development

```bash
npm install
cp .env.example .env   # then edit .env as needed
npm run dev
```

`npm run dev` starts on the port set by `VITE_PORT` in `.env` (falls
back to Vite's default, 5173, if unset). `strictPort` is on, so it
fails loudly instead of silently picking a different port if that one
is already taken.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for build commands, the full
environment variable reference, and per-host SPA-routing setup
(Netlify, Vercel, GitHub Pages, Nginx, Apache, IIS).
