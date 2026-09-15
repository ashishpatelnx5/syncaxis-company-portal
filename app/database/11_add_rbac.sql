-- Syncaxis Company Portal — migration 11
--
-- Replaces the two-level access model (Users.Role admin/user +
-- per-user portal.UserPermissions) with proper RBAC: Roles (named,
-- reusable permission bundles), User Groups, and a many-to-many mapping of
-- roles to users and groups. 'Admin' becomes a protected Role row instead
-- of a hardcoded string. Migrates existing accounts/grants before dropping
-- the old columns/table, so nobody silently loses access. Safe to re-run.
--
-- Run in SSMS (or sqlcmd) with the query window's database set to
-- SYNCAXIS_PORTAL.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

-- ============================================================
-- Tables
-- ============================================================

IF OBJECT_ID('portal.Roles', 'U') IS NULL
BEGIN
    PRINT 'Creating table portal.Roles...';
    CREATE TABLE portal.Roles (
        RoleId          INT IDENTITY(1,1) NOT NULL,
        Name            NVARCHAR(100)     NOT NULL,
        Description     NVARCHAR(500)      NULL,
        -- Only the seeded Admin role has this set — bypasses every
        -- permission check entirely rather than being granted individual
        -- pages/applications.
        IsFullAccess    BIT               NOT NULL CONSTRAINT DF_Roles_IsFullAccess DEFAULT 0,
        -- Only the seeded Admin role has this set — blocks delete and
        -- blocks ever turning IsFullAccess back off.
        IsProtected     BIT               NOT NULL CONSTRAINT DF_Roles_IsProtected DEFAULT 0,
        CreatedAt       DATETIME2         NOT NULL CONSTRAINT DF_Roles_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt       DATETIME2         NOT NULL CONSTRAINT DF_Roles_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Roles PRIMARY KEY (RoleId),
        CONSTRAINT UQ_Roles_Name UNIQUE (Name)
    );
END
GO

IF OBJECT_ID('portal.RolePermissions', 'U') IS NULL
BEGIN
    PRINT 'Creating table portal.RolePermissions...';
    -- Same shape as the old portal.UserPermissions, keyed by role instead
    -- of user. Valid ResourceKey values are defined once in the frontend
    -- (src/data/permissions.js, src/data/apps.js), not a database lookup
    -- table — same reasoning as portal.DailyPlanSlots.SlotIndex.
    CREATE TABLE portal.RolePermissions (
        RolePermissionId    INT IDENTITY(1,1) NOT NULL,
        RoleId              INT               NOT NULL,
        ResourceType        NVARCHAR(20)      NOT NULL,
        ResourceKey         NVARCHAR(50)      NOT NULL,
        CreatedAt           DATETIME2         NOT NULL CONSTRAINT DF_RolePermissions_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_RolePermissions PRIMARY KEY (RolePermissionId),
        CONSTRAINT UQ_RolePermissions UNIQUE (RoleId, ResourceType, ResourceKey),
        CONSTRAINT FK_RolePermissions_Role FOREIGN KEY (RoleId)
            REFERENCES portal.Roles (RoleId) ON DELETE CASCADE,
        CONSTRAINT CK_RolePermissions_ResourceType CHECK (ResourceType IN ('page', 'application'))
    );
END
GO

IF OBJECT_ID('portal.UserGroups', 'U') IS NULL
BEGIN
    PRINT 'Creating table portal.UserGroups...';
    CREATE TABLE portal.UserGroups (
        GroupId         INT IDENTITY(1,1) NOT NULL,
        Name            NVARCHAR(100)     NOT NULL,
        Description     NVARCHAR(500)      NULL,
        CreatedAt       DATETIME2         NOT NULL CONSTRAINT DF_UserGroups_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt       DATETIME2         NOT NULL CONSTRAINT DF_UserGroups_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_UserGroups PRIMARY KEY (GroupId),
        CONSTRAINT UQ_UserGroups_Name UNIQUE (Name)
    );
END
GO

IF OBJECT_ID('portal.UserGroupMembers', 'U') IS NULL
BEGIN
    PRINT 'Creating table portal.UserGroupMembers...';
    CREATE TABLE portal.UserGroupMembers (
        UserId      INT NOT NULL,
        GroupId     INT NOT NULL,
        CONSTRAINT PK_UserGroupMembers PRIMARY KEY (UserId, GroupId),
        CONSTRAINT FK_UserGroupMembers_User FOREIGN KEY (UserId)
            REFERENCES portal.Users (UserId) ON DELETE CASCADE,
        CONSTRAINT FK_UserGroupMembers_Group FOREIGN KEY (GroupId)
            REFERENCES portal.UserGroups (GroupId) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID('portal.UserRoles', 'U') IS NULL
BEGIN
    PRINT 'Creating table portal.UserRoles...';
    -- A user's own directly-assigned roles (in addition to whatever roles
    -- they inherit from any group they belong to, via GroupRoles below).
    CREATE TABLE portal.UserRoles (
        UserId      INT NOT NULL,
        RoleId      INT NOT NULL,
        CONSTRAINT PK_UserRoles PRIMARY KEY (UserId, RoleId),
        CONSTRAINT FK_UserRoles_User FOREIGN KEY (UserId)
            REFERENCES portal.Users (UserId) ON DELETE CASCADE,
        CONSTRAINT FK_UserRoles_Role FOREIGN KEY (RoleId)
            REFERENCES portal.Roles (RoleId) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID('portal.GroupRoles', 'U') IS NULL
BEGIN
    PRINT 'Creating table portal.GroupRoles...';
    -- Roles a group grants to every one of its members.
    CREATE TABLE portal.GroupRoles (
        GroupId     INT NOT NULL,
        RoleId      INT NOT NULL,
        CONSTRAINT PK_GroupRoles PRIMARY KEY (GroupId, RoleId),
        CONSTRAINT FK_GroupRoles_Group FOREIGN KEY (GroupId)
            REFERENCES portal.UserGroups (GroupId) ON DELETE CASCADE,
        CONSTRAINT FK_GroupRoles_Role FOREIGN KEY (RoleId)
            REFERENCES portal.Roles (RoleId) ON DELETE CASCADE
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserGroupMembers_GroupId' AND object_id = OBJECT_ID('portal.UserGroupMembers'))
    CREATE INDEX IX_UserGroupMembers_GroupId ON portal.UserGroupMembers (GroupId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserRoles_RoleId' AND object_id = OBJECT_ID('portal.UserRoles'))
    CREATE INDEX IX_UserRoles_RoleId ON portal.UserRoles (RoleId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GroupRoles_RoleId' AND object_id = OBJECT_ID('portal.GroupRoles'))
    CREATE INDEX IX_GroupRoles_RoleId ON portal.GroupRoles (RoleId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_RolePermissions_RoleId' AND object_id = OBJECT_ID('portal.RolePermissions'))
    CREATE INDEX IX_RolePermissions_RoleId ON portal.RolePermissions (RoleId);
GO

-- ============================================================
-- Migrate existing data before dropping the old columns/table
-- ============================================================

DECLARE @AdminRoleId INT;

SELECT @AdminRoleId = RoleId FROM portal.Roles WHERE Name = 'Admin';
IF @AdminRoleId IS NULL
BEGIN
    PRINT 'Seeding protected Admin role...';
    INSERT INTO portal.Roles (Name, Description, IsFullAccess, IsProtected)
    VALUES ('Admin', 'Unconditional full access to every page and application.', 1, 1);
    SET @AdminRoleId = SCOPE_IDENTITY();
END
GO

-- (separate batch so @AdminRoleId above is visible to what follows via a
-- fresh lookup — variables don't survive a GO batch boundary)
DECLARE @AdminRoleId INT = (SELECT RoleId FROM portal.Roles WHERE Name = 'Admin');

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.Users') AND name = 'Role')
BEGIN
    PRINT 'Migrating existing admin users into portal.UserRoles...';
    INSERT INTO portal.UserRoles (UserId, RoleId)
    SELECT u.UserId, @AdminRoleId
    FROM portal.Users u
    WHERE u.Role = 'admin'
      AND NOT EXISTS (SELECT 1 FROM portal.UserRoles ur WHERE ur.UserId = u.UserId AND ur.RoleId = @AdminRoleId);
END
GO

-- Any existing per-user direct grants (portal.UserPermissions) become a
-- personal "Legacy - <username>" role carrying the exact same permissions,
-- so migrating to RBAC never silently removes someone's access.
IF OBJECT_ID('portal.UserPermissions', 'U') IS NOT NULL
BEGIN
    DECLARE @UserId INT, @Username NVARCHAR(100), @NewRoleId INT, @RoleName NVARCHAR(100);
    DECLARE legacy_cursor CURSOR LOCAL FOR
        SELECT DISTINCT up.UserId, u.Username
        FROM portal.UserPermissions up
        JOIN portal.Users u ON u.UserId = up.UserId;

    OPEN legacy_cursor;
    FETCH NEXT FROM legacy_cursor INTO @UserId, @Username;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @RoleName = CONCAT('Legacy - ', @Username);
        PRINT CONCAT('Creating legacy role "', @RoleName, '" for user "', @Username, '"...');

        INSERT INTO portal.Roles (Name, Description) VALUES (@RoleName, 'Auto-created from this user''s pre-RBAC direct permission grants.');
        SET @NewRoleId = SCOPE_IDENTITY();

        INSERT INTO portal.RolePermissions (RoleId, ResourceType, ResourceKey)
        SELECT @NewRoleId, ResourceType, ResourceKey FROM portal.UserPermissions WHERE UserId = @UserId;

        INSERT INTO portal.UserRoles (UserId, RoleId) VALUES (@UserId, @NewRoleId);

        FETCH NEXT FROM legacy_cursor INTO @UserId, @Username;
    END
    CLOSE legacy_cursor;
    DEALLOCATE legacy_cursor;

    PRINT 'Dropping portal.UserPermissions...';
    DROP TABLE portal.UserPermissions;
END
GO

-- ============================================================
-- Drop the now-superseded Role column
-- ============================================================

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Users_Role')
    ALTER TABLE portal.Users DROP CONSTRAINT CK_Users_Role;
GO

IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_Users_Role')
    ALTER TABLE portal.Users DROP CONSTRAINT DF_Users_Role;
GO

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.Users') AND name = 'Role')
BEGIN
    PRINT 'Dropping portal.Users.Role...';
    ALTER TABLE portal.Users DROP COLUMN Role;
END
GO

PRINT 'Done.';
GO
