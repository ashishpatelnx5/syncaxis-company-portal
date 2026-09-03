# Syncaxis Company Portal

A React + Vite single-page app: employee directory, org chart, an
admin area for managing employees/departments, and quick links to
company applications (webmail, ERP, GreytHR, inquiry portal).

Employee/department data and login are backed by SQL Server through a
small Node/Express API in [`server/`](server/) — see
[DEPLOYMENT.md](DEPLOYMENT.md#architecture) for how the pieces fit
together and how to set up the database.

## Local development

```bash
npm install
cp .env.example .env   # then edit .env as needed

# In a second terminal — see server/README setup in DEPLOYMENT.md first
cd server && cp .env.example .env && npm install && npm run seed && npm run dev
```

Back in the first terminal, `npm run dev` starts the frontend on the
port set by `VITE_PORT` in `.env` (falls back to Vite's default, 5173,
if unset). `strictPort` is on, so it fails loudly instead of silently
picking a different port if that one is already taken.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for database setup, backend setup,
build commands, the full environment variable reference, and per-host
SPA-routing setup (Netlify, Vercel, GitHub Pages, Nginx, Apache, IIS).
