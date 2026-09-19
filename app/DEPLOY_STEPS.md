# Production deployment — step by step

Target: SYNCAXIS-SERVER. Branch: `feature/iam_integration`.

## 0. Before you start
- Take a full backup of `SYNCAXIS_PORTAL` (SSMS → Tasks → Back Up).
- Confirm `syncaxis-iam` is deployed and reachable from the portal server. This release delegates login and permissions to it (`IAM_API_URL`).

## 1. Compare databases
1. Run [database/deploy_check_state.sql](database/deploy_check_state.sql) on **production** in SSMS. Run it on local too if you want a side-by-side.
2. Rows with `Applied = 0` are the migrations production still needs.

## 2. Apply migrations (SSMS, database = SYNCAXIS_PORTAL)
Run the missing scripts from [database/](database/) **in numeric order**. Scripts 03-14 and 18-24 are safe to re-run. Special cases:

- **15 → 16 → 17 (IAM cutover) are one-way.** Only run them if production still has `portal.Users`/`portal.Roles` and nothing in step 1 shows 16 as applied.
  - Before 15: Portal's users, roles and permissions must already be copied into `syncaxis-iam` (see [../portal-integration-instructions.md](../portal-integration-instructions.md) §2), and login through IAM must work.
  - Run 15 (backup), verify, then 16 (drop). Run 17 only after a few weeks.
- 15 fails if re-run (schema already exists) — skip it if the backup schema exists.

## 3. Deploy the code
```
git pull origin feature/iam_integration
cd app && npm install && npm run build
cd server && npm install
```

## 4. Configure `app/server/.env` on the server
Copy `.env.example`, then set real values for: `DB_SERVER`, `DB_PASSWORD`, a **new** `JWT_SECRET`, `CORS_ORIGIN`, `IAM_API_URL`. Do not reuse dev secrets.

## 5. Register Portal permissions in IAM (once)
```
cd app/server && npm run register-iam-permissions
```

## 6. Start and verify
- Run `start.bat` (or your service manager: NSSM/pm2).
- Open `http://<server>:8050`; log in; check Home tiles, Directory, Complaints, Daily Plan, and Admin → Audit Log.
- Check the app's error output for SQL "invalid column/object" errors (means a migration was missed).

## Rollback
Stop the app, restore the step 0 backup, and redeploy the previous commit.
