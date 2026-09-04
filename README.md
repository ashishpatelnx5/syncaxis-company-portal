# Syncaxis Company Portal

A React + Vite single-page app: employee directory, org chart, an
admin area for managing employees/departments, and quick links to
company applications (webmail, ERP, GreytHR, inquiry portal).

Employee/department data and login are backed by SQL Server through a
small Node/Express API in [`server/`](server/) — see
[DEPLOYMENT.md](DEPLOYMENT.md#architecture) for how the pieces fit
together and how to set up the database.

## Running it

```bash
npm install
cp .env.example .env    # then edit .env as needed
cd server && cp .env.example .env && npm install && npm run seed && cd ..
```

Then either double-click **start.bat** (Windows) / run `npm run app:start`
— builds the frontend and starts the backend, which serves both the API
and the built frontend on one port — or, for active development with hot
reload, run `npm run dev` (frontend) and `npm run server` (backend) as two
separate terminals. See [DEPLOYMENT.md](DEPLOYMENT.md#architecture) for
details on both.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for database setup, backend setup,
build commands, the full environment variable reference, and per-host
SPA-routing setup (Netlify, Vercel, GitHub Pages, Nginx, Apache, IIS).
