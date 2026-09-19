-- Syncaxis Company Portal — migration 10
--
-- Adds account lockout tracking to portal.Users and a new
-- portal.UserPermissions table so an admin can grant a non-admin user
-- access to specific pages/applications. Safe to re-run.
--
-- Run in SSMS (or sqlcmd) with the query window's database set to
-- SYNCAXIS_PORTAL.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

-- ============================================================
-- portal.Users — lockout tracking + a real Role constraint
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.Users') AND name = 'FailedLoginCount')
BEGIN
    PRINT 'Adding portal.Users.FailedLoginCount...';
    ALTER TABLE portal.Users ADD FailedLoginCount INT NOT NULL CONSTRAINT DF_Users_FailedLoginCount DEFAULT 0;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.Users') AND name = 'IsLocked')
BEGIN
    PRINT 'Adding portal.Users.IsLocked...';
    ALTER TABLE portal.Users ADD IsLocked BIT NOT NULL CONSTRAINT DF_Users_IsLocked DEFAULT 0;
END
GO

-- Role was a free-text NVARCHAR with no constraint — pin it down now that
-- the app actually branches on the two values ('admin' has unconditional
-- access everywhere; 'user' is gated by portal.UserPermissions).
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Users_Role')
BEGIN
    PRINT 'Adding CK_Users_Role...';
    ALTER TABLE portal.Users WITH CHECK ADD CONSTRAINT CK_Users_Role CHECK (Role IN ('admin', 'user'));
END
GO

-- ============================================================
-- portal.UserPermissions — per-user page/application grants
-- ============================================================
--
-- Only meaningful for Role = 'user' (an 'admin' always has full access and
-- never has rows here). The set of valid ResourceKey values is defined once
-- in the frontend (src/data/permissions.js, src/data/apps.js) rather than a
-- database lookup table — same pattern already used for
-- portal.DailyPlanSlots.SlotIndex.

IF OBJECT_ID('portal.UserPermissions', 'U') IS NULL
BEGIN
    PRINT 'Creating table portal.UserPermissions...';
    CREATE TABLE portal.UserPermissions (
        UserPermissionId    INT IDENTITY(1,1) NOT NULL,
        UserId              INT               NOT NULL,
        ResourceType        NVARCHAR(20)      NOT NULL,
        ResourceKey         NVARCHAR(50)      NOT NULL,
        CreatedAt           DATETIME2         NOT NULL CONSTRAINT DF_UserPermissions_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_UserPermissions PRIMARY KEY (UserPermissionId),
        CONSTRAINT UQ_UserPermissions UNIQUE (UserId, ResourceType, ResourceKey),
        CONSTRAINT FK_UserPermissions_User FOREIGN KEY (UserId)
            REFERENCES portal.Users (UserId) ON DELETE CASCADE,
        CONSTRAINT CK_UserPermissions_ResourceType CHECK (ResourceType IN ('page', 'application'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserPermissions_UserId' AND object_id = OBJECT_ID('portal.UserPermissions'))
    CREATE INDEX IX_UserPermissions_UserId ON portal.UserPermissions (UserId);
GO

PRINT 'Done.';
GO
