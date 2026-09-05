# Syncaxis Company Portal

A React + Vite single-page app: employee directory, org chart, company
holidays, job descriptions, daily plan sheets, and an admin area for
managing employees/departments — plus quick links to company applications
(webmail, ERP, GreytHR, inquiry portal).

Employee/department data and login are backed by SQL Server through a
small Node/Express API in [`app/server/`](app/server/) — see
[app/DEPLOYMENT.md](app/DEPLOYMENT.md#architecture) for how the pieces fit
together and how to set up the database.

## Layout

```
syncaxis-company-portal/
├── start.bat / stop.bat   ← run the app
└── app/                   ← all source code and configuration
```

Everything you'd normally go looking for — frontend source, backend
source, database scripts, `.env` files, `package.json` — lives under
[`app/`](app/). The repo root is kept to just the two commands you need
day to day.

## Running it

First time only, from the repo root:

```bash
cd app
npm install
cp .env.example .env    # then edit .env as needed
cd server && cp .env.example .env && npm install && npm run seed && cd ../..
```

Then, from the repo root, either double-click **start.bat** (Windows) —
builds the frontend and starts the backend, which serves both the API and
the built frontend on one port — or, for active development with hot
reload, run `npm run dev` (frontend) and `npm run server` (backend) from
inside `app/` as two separate terminals. **stop.bat** stops it. See
[app/DEPLOYMENT.md](app/DEPLOYMENT.md#architecture) for details on both.

## Deployment

See [app/DEPLOYMENT.md](app/DEPLOYMENT.md) for database setup, backend
setup, build commands, the full environment variable reference, and
per-host SPA-routing setup (Netlify, Vercel, GitHub Pages, Nginx, Apache,
IIS).
