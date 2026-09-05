-- Syncaxis Company Portal — step 1 of 2
--
-- Run this script in SSMS connected to the server as a sysadmin (e.g. `sa`,
-- or your own Windows admin login), with the query window's database set to
-- `master`. It creates the dedicated database and the SQL login the backend
-- API will connect as.
--
-- Requires "SQL Server and Windows Authentication mode" (mixed mode) to be
-- enabled on the instance — CREATE LOGIN ... WITH PASSWORD fails under
-- Windows-Authentication-only mode. To check/change: right-click the server
-- in Object Explorer > Properties > Security > Server authentication, then
-- restart the SQL Server service if you change it.

SET NOCOUNT ON;
GO

IF DB_ID(N'SYNCAXIS_PORTAL') IS NULL
BEGIN
    PRINT 'Creating database SYNCAXIS_PORTAL...';
    CREATE DATABASE SYNCAXIS_PORTAL;
END
ELSE
    PRINT 'Database SYNCAXIS_PORTAL already exists, skipping.';
GO

ALTER DATABASE SYNCAXIS_PORTAL SET RECOVERY SIMPLE;
GO

-- Dedicated login for the backend API only — not for interactive/admin use.
-- REPLACE THE PLACEHOLDER PASSWORD BELOW before running, then put the same
-- value in server/.env as DB_PASSWORD. Never commit a real password here —
-- this file is tracked in git.
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'syncaxis_portal_app')
BEGIN
    PRINT 'Creating login syncaxis_portal_app...';
    CREATE LOGIN syncaxis_portal_app
        WITH PASSWORD = N'REPLACE_WITH_A_STRONG_PASSWORD',
        CHECK_POLICY = ON,
        CHECK_EXPIRATION = OFF; -- service account: no forced periodic rotation that would silently break the app
END
ELSE
    PRINT 'Login syncaxis_portal_app already exists, skipping.';
GO

-- Belt-and-braces: this login should only ever be able to log into
-- SYNCAXIS_PORTAL, never anything else on the server.
ALTER LOGIN syncaxis_portal_app WITH DEFAULT_DATABASE = SYNCAXIS_PORTAL;
GO

PRINT 'Done. Next, run 02_schema.sql with the query window set to the SYNCAXIS_PORTAL database.';
GO
