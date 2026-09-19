-- Syncaxis Company Portal — migration 14
--
-- syncaxis-iam integration (see portal-integration-instructions.md, §6.5).
-- portal.Users is being decommissioned as the identity authority; the
-- employee linkage it used to carry (Users.EmployeeId) needs a permanent
-- home that survives that, on portal.Employees itself. AuthUserId holds the
-- AuthCenter (syncaxis-iam) UserId going forward. Plain nullable column, no
-- cross-database foreign key — AuthCenter may live on a different server in
-- production, so this is an application-level reference, not an enforced
-- one. Safe to re-run.
--
-- Backfilled from the migration mapping produced when portal's identity
-- data was copied into AuthCenter:
-- F:\Workspace\syncaxis-iam\migration-output\portal-user-employee-mapping.json
--
-- NOTE: EmployeeId 13 had two portal logins (syncaxisadmin, ashish.patel) —
-- AuthUserId can only hold one. Linked to ashish.patel (AuthCenter UserId
-- 20) per decision on 2026-09-15; syncaxisadmin is left unlinked here.
--
-- Run in SSMS (or sqlcmd) with the query window's database set to
-- SYNCAXIS_PORTAL.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO
-- Required for the filtered index below — sqlcmd's session default can be OFF.
SET QUOTED_IDENTIFIER ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.Employees') AND name = 'AuthUserId')
BEGIN
    PRINT 'Adding portal.Employees.AuthUserId...';
    ALTER TABLE portal.Employees ADD AuthUserId INT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Employees_AuthUserId' AND object_id = OBJECT_ID('portal.Employees'))
    CREATE UNIQUE INDEX IX_Employees_AuthUserId ON portal.Employees (AuthUserId) WHERE AuthUserId IS NOT NULL;
GO

PRINT 'Backfilling AuthUserId from the syncaxis-iam migration mapping...';
UPDATE e
SET e.AuthUserId = m.AuthCenterUserId
FROM portal.Employees e
JOIN (VALUES
    (2,  6,  'aditya.bisure'),
    (11, 7,  'atharva.kulkarni'),
    (6,  8,  'atul.pundkar'),
    (14, 9,  'deepak.bisure'),
    (9,  10, 'gargi.kulkarni'),
    (10, 11, 'kshitij.bhosale'),
    (1,  12, 'mahesh.babar'),
    (7,  13, 'mohsin.mulla'),
    (8,  14, 'pooja.surywanshi'),
    (5,  15, 'rahul.fokmare'),
    (4,  16, 'sivasankar.s'),
    (20, 17, 'shripad.pathak'),
    (3,  18, 'shubham.kale'),
    (21, 19, 'sohail.momin'),
    (13, 20, 'ashish.patel')
) AS m(EmployeeId, AuthCenterUserId, Username) ON m.EmployeeId = e.EmployeeId;
GO

PRINT 'Done.';
GO
