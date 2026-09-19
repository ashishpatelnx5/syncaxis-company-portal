-- Syncaxis Company Portal — FULL schema for a FRESH database (generated).
-- Concatenation of 02_schema.sql plus migrations 03-08, 10-14, 16, 18-24, in order
-- (15 and 17 - the IAM backup schema - are intentionally skipped). Ends at the
-- same schema as a fully migrated database. Run against a NEW, empty SYNCAXIS_PORTAL
-- after 01_create_database_and_login.sql. Do not run on an existing database.

-- ===== 02_schema.sql =====
-- Syncaxis Company Portal — step 2 of 2
--
-- Run this script in SSMS with the query window's database set to
-- SYNCAXIS_PORTAL (run 01_create_database_and_login.sql first). Creates the
-- app user, the `portal` schema, its tables/indexes/triggers/view, and
-- grants the app login just enough access to that one schema — nothing
-- database-wide.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

-- ============================================================
-- User + schema
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'syncaxis_portal_app')
BEGIN
    PRINT 'Creating database user syncaxis_portal_app...';
    CREATE USER syncaxis_portal_app FOR LOGIN syncaxis_portal_app;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'portal')
BEGIN
    PRINT 'Creating schema portal...';
    EXEC('CREATE SCHEMA portal AUTHORIZATION dbo');
END
GO

-- ============================================================
-- Tables
-- ============================================================

IF OBJECT_ID('portal.Departments', 'U') IS NULL
BEGIN
    CREATE TABLE portal.Departments (
        DepartmentId    INT IDENTITY(1,1) NOT NULL,
        Name            NVARCHAR(100)     NOT NULL,
        CreatedAt       DATETIME2         NOT NULL CONSTRAINT DF_Departments_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt       DATETIME2         NOT NULL CONSTRAINT DF_Departments_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Departments PRIMARY KEY (DepartmentId),
        CONSTRAINT UQ_Departments_Name UNIQUE (Name)
    );
END
GO

IF OBJECT_ID('portal.JobDescriptions', 'U') IS NULL
BEGIN
    CREATE TABLE portal.JobDescriptions (
        JobDescriptionId    INT IDENTITY(1,1) NOT NULL,
        Title                NVARCHAR(200)     NOT NULL,
        DepartmentId         INT               NOT NULL,
        ReportingTo          NVARCHAR(200)     NULL,
        ContentJson          NVARCHAR(MAX)     NOT NULL,
        CreatedAt            DATETIME2         NOT NULL CONSTRAINT DF_JobDescriptions_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt            DATETIME2         NOT NULL CONSTRAINT DF_JobDescriptions_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_JobDescriptions PRIMARY KEY (JobDescriptionId),
        CONSTRAINT FK_JobDescriptions_Department FOREIGN KEY (DepartmentId) REFERENCES portal.Departments (DepartmentId)
    );
END
GO

IF OBJECT_ID('portal.Employees', 'U') IS NULL
BEGIN
    CREATE TABLE portal.Employees (
        EmployeeId                  INT IDENTITY(1,1)  NOT NULL,
        EmployeeCode                NVARCHAR(20)        NULL,
        Name                        NVARCHAR(200)       NOT NULL,
        Title                       NVARCHAR(200)       NULL,
        Email                       NVARCHAR(256)       NULL,
        Phone                       NVARCHAR(50)        NULL,
        PhotoUrl                    NVARCHAR(MAX)        NULL,
        ManagerId                   INT                  NULL,
        JobDescriptionId            INT                  NULL,
        EmergencyContactName        NVARCHAR(200)        NULL,
        EmergencyContactRelation    NVARCHAR(100)        NULL,
        EmergencyContactPhone       NVARCHAR(50)         NULL,
        CreatedAt                   DATETIME2           NOT NULL CONSTRAINT DF_Employees_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt                   DATETIME2           NOT NULL CONSTRAINT DF_Employees_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Employees PRIMARY KEY (EmployeeId),
        CONSTRAINT FK_Employees_Manager FOREIGN KEY (ManagerId) REFERENCES portal.Employees (EmployeeId),
        CONSTRAINT FK_Employees_JobDescription FOREIGN KEY (JobDescriptionId)
            REFERENCES portal.JobDescriptions (JobDescriptionId) ON DELETE SET NULL
    );
END
GO

IF OBJECT_ID('portal.EmployeeDepartments', 'U') IS NULL
BEGIN
    CREATE TABLE portal.EmployeeDepartments (
        EmployeeId      INT NOT NULL,
        DepartmentId    INT NOT NULL,
        CONSTRAINT PK_EmployeeDepartments PRIMARY KEY (EmployeeId, DepartmentId),
        CONSTRAINT FK_EmployeeDepartments_Employee FOREIGN KEY (EmployeeId)
            REFERENCES portal.Employees (EmployeeId) ON DELETE CASCADE,
        CONSTRAINT FK_EmployeeDepartments_Department FOREIGN KEY (DepartmentId)
            REFERENCES portal.Departments (DepartmentId) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID('portal.Holidays', 'U') IS NULL
BEGIN
    -- Financial year isn't stored — it's derived from HolidayDate (India's
    -- FY runs April-March) both in the API and the frontend, so there's
    -- never a mismatch between a holiday's date and which year it's grouped under.
    CREATE TABLE portal.Holidays (
        HolidayId      INT IDENTITY(1,1) NOT NULL,
        HolidayDate    DATE              NOT NULL,
        Name           NVARCHAR(200)     NOT NULL,
        Type           NVARCHAR(20)      NOT NULL,
        CreatedAt      DATETIME2         NOT NULL CONSTRAINT DF_Holidays_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt      DATETIME2         NOT NULL CONSTRAINT DF_Holidays_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Holidays PRIMARY KEY (HolidayId),
        CONSTRAINT CK_Holidays_Type CHECK (Type IN ('National', 'Festival'))
    );
END
GO

IF OBJECT_ID('portal.Complaints', 'U') IS NULL
BEGIN
    -- Internal complaints/issues/feedback log. EmployeeId is nullable with
    -- ON DELETE SET NULL — if the raiser's employee record is ever removed,
    -- the entry itself is kept as a record, just unlinked from a person.
    CREATE TABLE portal.Complaints (
        ComplaintId    INT IDENTITY(1,1) NOT NULL,
        EmployeeId     INT               NULL,
        Category       NVARCHAR(20)      NOT NULL,
        Subject        NVARCHAR(200)     NOT NULL,
        Description    NVARCHAR(MAX)     NOT NULL,
        Status         NVARCHAR(20)      NOT NULL CONSTRAINT DF_Complaints_Status DEFAULT 'Open',
        CreatedAt      DATETIME2         NOT NULL CONSTRAINT DF_Complaints_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt      DATETIME2         NOT NULL CONSTRAINT DF_Complaints_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Complaints PRIMARY KEY (ComplaintId),
        CONSTRAINT FK_Complaints_Employee FOREIGN KEY (EmployeeId)
            REFERENCES portal.Employees (EmployeeId) ON DELETE SET NULL,
        CONSTRAINT CK_Complaints_Category CHECK (Category IN ('Complaint', 'Issue', 'Feedback')),
        CONSTRAINT CK_Complaints_Status CHECK (Status IN ('Open', 'In Progress', 'Resolved', 'Closed'))
    );
END
GO

IF OBJECT_ID('portal.ComplaintHistory', 'U') IS NULL
BEGIN
    -- Append-only status timeline for a complaint — one row per status the
    -- entry has ever been set to (including the initial 'Open' on
    -- creation), each with an optional comment and a server-generated
    -- timestamp. Never updated once written, so there's no UpdatedAt here.
    CREATE TABLE portal.ComplaintHistory (
        ComplaintHistoryId    INT IDENTITY(1,1) NOT NULL,
        ComplaintId           INT               NOT NULL,
        Status                NVARCHAR(20)      NOT NULL,
        Comment               NVARCHAR(MAX)     NULL,
        CreatedAt             DATETIME2         NOT NULL CONSTRAINT DF_ComplaintHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_ComplaintHistory PRIMARY KEY (ComplaintHistoryId),
        CONSTRAINT FK_ComplaintHistory_Complaint FOREIGN KEY (ComplaintId)
            REFERENCES portal.Complaints (ComplaintId) ON DELETE CASCADE,
        CONSTRAINT CK_ComplaintHistory_Status CHECK (Status IN ('Open', 'In Progress', 'Resolved', 'Closed'))
    );
END
GO

IF OBJECT_ID('portal.DailyPlans', 'U') IS NULL
BEGIN
    CREATE TABLE portal.DailyPlans (
        DailyPlanId      INT IDENTITY(1,1) NOT NULL,
        EmployeeId       INT               NOT NULL,
        PlanDate         DATE              NOT NULL,
        SelfAssessment   INT               NULL,
        CreatedAt        DATETIME2         NOT NULL CONSTRAINT DF_DailyPlans_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt        DATETIME2         NOT NULL CONSTRAINT DF_DailyPlans_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_DailyPlans PRIMARY KEY (DailyPlanId),
        CONSTRAINT UQ_DailyPlans_Employee_Date UNIQUE (EmployeeId, PlanDate),
        CONSTRAINT FK_DailyPlans_Employee FOREIGN KEY (EmployeeId)
            REFERENCES portal.Employees (EmployeeId) ON DELETE CASCADE,
        CONSTRAINT CK_DailyPlans_SelfAssessment CHECK (SelfAssessment IS NULL OR SelfAssessment BETWEEN 0 AND 100)
    );
END
GO

IF OBJECT_ID('portal.DailyPlanSlots', 'U') IS NULL
BEGIN
    -- SlotIndex identifies which of the 8 fixed time blocks (defined in the
    -- frontend, src/data/dailyPlanSlots.js) this row is for — the schema
    -- doesn't store slot times since they're the same for every day.
    CREATE TABLE portal.DailyPlanSlots (
        DailyPlanSlotId    INT IDENTITY(1,1) NOT NULL,
        DailyPlanId        INT               NOT NULL,
        SlotIndex          INT               NOT NULL,
        PlanText           NVARCHAR(500)     NULL,
        ActualText         NVARCHAR(500)     NULL,
        ValueAddedHrs      DECIMAL(4,2)      NULL,
        NonValueAddedHrs   DECIMAL(4,2)      NULL,
        Remarks            NVARCHAR(500)     NULL,
        CONSTRAINT PK_DailyPlanSlots PRIMARY KEY (DailyPlanSlotId),
        CONSTRAINT UQ_DailyPlanSlots_Plan_Slot UNIQUE (DailyPlanId, SlotIndex),
        CONSTRAINT FK_DailyPlanSlots_DailyPlan FOREIGN KEY (DailyPlanId)
            REFERENCES portal.DailyPlans (DailyPlanId) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID('portal.Users', 'U') IS NULL
BEGIN
    CREATE TABLE portal.Users (
        UserId              INT IDENTITY(1,1) NOT NULL,
        Username            NVARCHAR(100)      NOT NULL,
        PasswordHash        NVARCHAR(255)      NOT NULL,
        DisplayName         NVARCHAR(200)       NULL,
        IsActive            BIT                NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
        FailedLoginCount    INT                NOT NULL CONSTRAINT DF_Users_FailedLoginCount DEFAULT 0,
        IsLocked            BIT                NOT NULL CONSTRAINT DF_Users_IsLocked DEFAULT 0,
        LastLoginAt         DATETIME2           NULL,
        -- Set by the app whenever PasswordHash is written (account
        -- creation, an admin's reset, or the user's own change-password) —
        -- powers the "password last changed" line on My Account.
        PasswordChangedAt   DATETIME2           NULL,
        -- The employee record this login belongs to, if any (not every
        -- login needs one — a pure admin/service account can stay
        -- unlinked). Powers the self-service "My Profile" page. ON DELETE
        -- SET NULL: removing the employee record unlinks the login instead
        -- of deleting the account.
        EmployeeId          INT                 NULL,
        CreatedAt           DATETIME2          NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt           DATETIME2          NOT NULL CONSTRAINT DF_Users_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Users PRIMARY KEY (UserId),
        CONSTRAINT UQ_Users_Username UNIQUE (Username),
        CONSTRAINT FK_Users_Employee FOREIGN KEY (EmployeeId) REFERENCES portal.Employees (EmployeeId) ON DELETE SET NULL
    );
END
GO

-- ============================================================
-- RBAC — Roles, Role permissions, User Groups, and the mappings between
-- them. A user's effective access is the union of permissions from every
-- role assigned directly to them (UserRoles) plus every role assigned to
-- any group they belong to (UserGroupMembers + GroupRoles). The seeded
-- 'Admin' role has IsFullAccess = 1, bypassing permission checks entirely
-- rather than being granted individual pages/applications, and IsProtected
-- = 1, which blocks deleting it or ever clearing IsFullAccess. The set of
-- valid ResourceKey values is defined once in the frontend
-- (src/data/permissions.js, src/data/apps.js), not a database lookup
-- table — same pattern as portal.DailyPlanSlots.SlotIndex above.
-- ============================================================

IF OBJECT_ID('portal.Roles', 'U') IS NULL
BEGIN
    CREATE TABLE portal.Roles (
        RoleId          INT IDENTITY(1,1) NOT NULL,
        Name            NVARCHAR(100)     NOT NULL,
        Description     NVARCHAR(500)      NULL,
        IsFullAccess    BIT               NOT NULL CONSTRAINT DF_Roles_IsFullAccess DEFAULT 0,
        IsProtected     BIT               NOT NULL CONSTRAINT DF_Roles_IsProtected DEFAULT 0,
        CreatedAt       DATETIME2         NOT NULL CONSTRAINT DF_Roles_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt       DATETIME2         NOT NULL CONSTRAINT DF_Roles_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Roles PRIMARY KEY (RoleId),
        CONSTRAINT UQ_Roles_Name UNIQUE (Name)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM portal.Roles WHERE Name = 'Admin')
    INSERT INTO portal.Roles (Name, Description, IsFullAccess, IsProtected)
    VALUES ('Admin', 'Unconditional full access to every page and application.', 1, 1);
GO

IF OBJECT_ID('portal.RolePermissions', 'U') IS NULL
BEGIN
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

-- ============================================================
-- Indexes
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_EmployeeId' AND object_id = OBJECT_ID('portal.Users'))
    CREATE INDEX IX_Users_EmployeeId ON portal.Users (EmployeeId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Employees_ManagerId' AND object_id = OBJECT_ID('portal.Employees'))
    CREATE INDEX IX_Employees_ManagerId ON portal.Employees (ManagerId);
GO

-- A plain UNIQUE constraint would only allow ONE NULL EmployeeCode across
-- the whole table (unlike most databases, SQL Server treats a unique
-- index's NULLs as a value that itself must be unique) — a filtered index
-- lets any number of employees have a blank employee ID.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Employees_EmployeeCode' AND object_id = OBJECT_ID('portal.Employees'))
    CREATE UNIQUE INDEX UX_Employees_EmployeeCode ON portal.Employees (EmployeeCode) WHERE EmployeeCode IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EmployeeDepartments_DepartmentId' AND object_id = OBJECT_ID('portal.EmployeeDepartments'))
    CREATE INDEX IX_EmployeeDepartments_DepartmentId ON portal.EmployeeDepartments (DepartmentId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_JobDescriptions_DepartmentId' AND object_id = OBJECT_ID('portal.JobDescriptions'))
    CREATE INDEX IX_JobDescriptions_DepartmentId ON portal.JobDescriptions (DepartmentId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Employees_JobDescriptionId' AND object_id = OBJECT_ID('portal.Employees'))
    CREATE INDEX IX_Employees_JobDescriptionId ON portal.Employees (JobDescriptionId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_DailyPlans_PlanDate' AND object_id = OBJECT_ID('portal.DailyPlans'))
    CREATE INDEX IX_DailyPlans_PlanDate ON portal.DailyPlans (PlanDate);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_DailyPlanSlots_DailyPlanId' AND object_id = OBJECT_ID('portal.DailyPlanSlots'))
    CREATE INDEX IX_DailyPlanSlots_DailyPlanId ON portal.DailyPlanSlots (DailyPlanId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Holidays_HolidayDate' AND object_id = OBJECT_ID('portal.Holidays'))
    CREATE INDEX IX_Holidays_HolidayDate ON portal.Holidays (HolidayDate);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Complaints_EmployeeId' AND object_id = OBJECT_ID('portal.Complaints'))
    CREATE INDEX IX_Complaints_EmployeeId ON portal.Complaints (EmployeeId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Complaints_Status' AND object_id = OBJECT_ID('portal.Complaints'))
    CREATE INDEX IX_Complaints_Status ON portal.Complaints (Status);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ComplaintHistory_ComplaintId' AND object_id = OBJECT_ID('portal.ComplaintHistory'))
    CREATE INDEX IX_ComplaintHistory_ComplaintId ON portal.ComplaintHistory (ComplaintId);
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
-- Triggers — keep UpdatedAt current without every caller remembering to set it
-- ============================================================

CREATE OR ALTER TRIGGER portal.TR_Departments_UpdatedAt ON portal.Departments
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE d SET UpdatedAt = SYSUTCDATETIME()
    FROM portal.Departments d
    JOIN inserted i ON i.DepartmentId = d.DepartmentId;
END
GO

CREATE OR ALTER TRIGGER portal.TR_Employees_UpdatedAt ON portal.Employees
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE e SET UpdatedAt = SYSUTCDATETIME()
    FROM portal.Employees e
    JOIN inserted i ON i.EmployeeId = e.EmployeeId;
END
GO

CREATE OR ALTER TRIGGER portal.TR_Users_UpdatedAt ON portal.Users
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE u SET UpdatedAt = SYSUTCDATETIME()
    FROM portal.Users u
    JOIN inserted i ON i.UserId = u.UserId;
END
GO

CREATE OR ALTER TRIGGER portal.TR_JobDescriptions_UpdatedAt ON portal.JobDescriptions
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE j SET UpdatedAt = SYSUTCDATETIME()
    FROM portal.JobDescriptions j
    JOIN inserted i ON i.JobDescriptionId = j.JobDescriptionId;
END
GO

CREATE OR ALTER TRIGGER portal.TR_DailyPlans_UpdatedAt ON portal.DailyPlans
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p SET UpdatedAt = SYSUTCDATETIME()
    FROM portal.DailyPlans p
    JOIN inserted i ON i.DailyPlanId = p.DailyPlanId;
END
GO

CREATE OR ALTER TRIGGER portal.TR_Holidays_UpdatedAt ON portal.Holidays
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE h SET UpdatedAt = SYSUTCDATETIME()
    FROM portal.Holidays h
    JOIN inserted i ON i.HolidayId = h.HolidayId;
END
GO

CREATE OR ALTER TRIGGER portal.TR_Complaints_UpdatedAt ON portal.Complaints
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE c SET UpdatedAt = SYSUTCDATETIME()
    FROM portal.Complaints c
    JOIN inserted i ON i.ComplaintId = c.ComplaintId;
END
GO

-- ============================================================
-- View — directory listing with department names and manager name flattened
-- ============================================================

CREATE OR ALTER VIEW portal.EmployeeDirectory AS
SELECT
    e.EmployeeId,
    e.EmployeeCode,
    e.Name,
    e.Title,
    e.Email,
    e.Phone,
    e.ManagerId,
    m.Name AS ManagerName,
    STRING_AGG(dept.Name, ', ') WITHIN GROUP (ORDER BY dept.Name) AS DepartmentNames
FROM portal.Employees e
LEFT JOIN portal.Employees m ON m.EmployeeId = e.ManagerId
LEFT JOIN portal.EmployeeDepartments ed ON ed.EmployeeId = e.EmployeeId
LEFT JOIN portal.Departments dept ON dept.DepartmentId = ed.DepartmentId
GROUP BY e.EmployeeId, e.EmployeeCode, e.Name, e.Title, e.Email, e.Phone, e.ManagerId, m.Name;
GO

-- ============================================================
-- Grants — schema-scoped only, no database-wide roles
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::portal TO syncaxis_portal_app;
GO

PRINT 'Schema ready. Next: copy server/.env.example to server/.env, fill in DB_PASSWORD, then run "npm run seed" from server/.';
GO

GO

-- ===== 03_fix_employee_code_null_uniqueness.sql =====
-- Syncaxis Company Portal — fix for a real bug found in production use.
--
-- SQL Server's plain UNIQUE constraint only allows ONE NULL value per
-- column (unlike most databases, which treat every NULL as distinct). Since
-- portal.Employees.EmployeeCode is NULL for anyone without an employee ID
-- (e.g. the Managing Director), the second such person hit a false
-- "That employee ID is already in use" error when they had no ID at all.
--
-- Fix: replace the plain UNIQUE constraint with a filtered unique index
-- that only enforces uniqueness where EmployeeCode IS NOT NULL, so any
-- number of employees can have a blank employee ID.
--
-- Run this once in SSMS, connected as a sysadmin, with the query window's
-- database set to SYNCAXIS_PORTAL. Safe to re-run.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_Employees_EmployeeCode')
BEGIN
    PRINT 'Dropping old UQ_Employees_EmployeeCode constraint...';
    ALTER TABLE portal.Employees DROP CONSTRAINT UQ_Employees_EmployeeCode;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Employees_EmployeeCode' AND object_id = OBJECT_ID('portal.Employees'))
BEGIN
    PRINT 'Creating filtered unique index UX_Employees_EmployeeCode...';
    CREATE UNIQUE INDEX UX_Employees_EmployeeCode ON portal.Employees (EmployeeCode) WHERE EmployeeCode IS NOT NULL;
END
GO

PRINT 'Done.';
GO

GO

-- ===== 04_add_job_descriptions.sql =====
-- Syncaxis Company Portal — adds Job Descriptions.
--
-- Adds portal.JobDescriptions (one row per role, grouped by department, with
-- its structured content stored as JSON) and a nullable JobDescriptionId on
-- portal.Employees so an employee can optionally be assigned one. Deleting a
-- job description clears that assignment (ON DELETE SET NULL) rather than
-- blocking — matches how department deletion already unassigns employees.
--
-- Run this once in SSMS, connected as a sysadmin, with the query window's
-- database set to SYNCAXIS_PORTAL. Safe to re-run.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF OBJECT_ID('portal.JobDescriptions', 'U') IS NULL
BEGIN
    PRINT 'Creating table portal.JobDescriptions...';
    CREATE TABLE portal.JobDescriptions (
        JobDescriptionId    INT IDENTITY(1,1) NOT NULL,
        Title                NVARCHAR(200)     NOT NULL,
        DepartmentId         INT               NOT NULL,
        ReportingTo          NVARCHAR(200)     NULL,
        ContentJson          NVARCHAR(MAX)     NOT NULL,
        CreatedAt            DATETIME2         NOT NULL CONSTRAINT DF_JobDescriptions_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt            DATETIME2         NOT NULL CONSTRAINT DF_JobDescriptions_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_JobDescriptions PRIMARY KEY (JobDescriptionId),
        CONSTRAINT FK_JobDescriptions_Department FOREIGN KEY (DepartmentId) REFERENCES portal.Departments (DepartmentId)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.Employees') AND name = 'JobDescriptionId')
BEGIN
    PRINT 'Adding column Employees.JobDescriptionId...';
    ALTER TABLE portal.Employees ADD JobDescriptionId INT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Employees_JobDescription')
BEGIN
    PRINT 'Adding constraint FK_Employees_JobDescription...';
    ALTER TABLE portal.Employees ADD CONSTRAINT FK_Employees_JobDescription
        FOREIGN KEY (JobDescriptionId) REFERENCES portal.JobDescriptions (JobDescriptionId) ON DELETE SET NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_JobDescriptions_DepartmentId' AND object_id = OBJECT_ID('portal.JobDescriptions'))
BEGIN
    PRINT 'Creating index IX_JobDescriptions_DepartmentId...';
    CREATE INDEX IX_JobDescriptions_DepartmentId ON portal.JobDescriptions (DepartmentId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Employees_JobDescriptionId' AND object_id = OBJECT_ID('portal.Employees'))
BEGIN
    PRINT 'Creating index IX_Employees_JobDescriptionId...';
    CREATE INDEX IX_Employees_JobDescriptionId ON portal.Employees (JobDescriptionId);
END
GO

PRINT 'Creating/updating trigger TR_JobDescriptions_UpdatedAt...';
GO
CREATE OR ALTER TRIGGER portal.TR_JobDescriptions_UpdatedAt ON portal.JobDescriptions
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE j SET UpdatedAt = SYSUTCDATETIME()
    FROM portal.JobDescriptions j
    JOIN inserted i ON i.JobDescriptionId = j.JobDescriptionId;
END
GO

PRINT 'Done.';
GO

GO

-- ===== 05_add_daily_plans.sql =====
-- Syncaxis Company Portal — adds Daily Plan Sheets.
--
-- Digitizes the paper "Daily Plan Sheet" (employee name, department, date,
-- 8 fixed time-block rows of Plan/Actual/Value-Added/Non-Value-Added
-- hours/Remarks, plus a 0-100 self-assessment score). One portal.DailyPlans
-- row per employee per day, with 8 child portal.DailyPlanSlots rows (one
-- per fixed time block — the block times themselves live in the frontend,
-- src/data/dailyPlanSlots.js, not in the database).
--
-- Run this once in SSMS, connected as a sysadmin, with the query window's
-- database set to SYNCAXIS_PORTAL. Safe to re-run.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF OBJECT_ID('portal.DailyPlans', 'U') IS NULL
BEGIN
    PRINT 'Creating table portal.DailyPlans...';
    CREATE TABLE portal.DailyPlans (
        DailyPlanId      INT IDENTITY(1,1) NOT NULL,
        EmployeeId       INT               NOT NULL,
        PlanDate         DATE              NOT NULL,
        SelfAssessment   INT               NULL,
        CreatedAt        DATETIME2         NOT NULL CONSTRAINT DF_DailyPlans_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt        DATETIME2         NOT NULL CONSTRAINT DF_DailyPlans_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_DailyPlans PRIMARY KEY (DailyPlanId),
        CONSTRAINT UQ_DailyPlans_Employee_Date UNIQUE (EmployeeId, PlanDate),
        CONSTRAINT FK_DailyPlans_Employee FOREIGN KEY (EmployeeId)
            REFERENCES portal.Employees (EmployeeId) ON DELETE CASCADE,
        CONSTRAINT CK_DailyPlans_SelfAssessment CHECK (SelfAssessment IS NULL OR SelfAssessment BETWEEN 0 AND 100)
    );
END
GO

IF OBJECT_ID('portal.DailyPlanSlots', 'U') IS NULL
BEGIN
    PRINT 'Creating table portal.DailyPlanSlots...';
    CREATE TABLE portal.DailyPlanSlots (
        DailyPlanSlotId    INT IDENTITY(1,1) NOT NULL,
        DailyPlanId        INT               NOT NULL,
        SlotIndex          INT               NOT NULL,
        PlanText           NVARCHAR(500)     NULL,
        ActualText         NVARCHAR(500)     NULL,
        ValueAddedHrs      DECIMAL(4,2)      NULL,
        NonValueAddedHrs   DECIMAL(4,2)      NULL,
        Remarks            NVARCHAR(500)     NULL,
        CONSTRAINT PK_DailyPlanSlots PRIMARY KEY (DailyPlanSlotId),
        CONSTRAINT UQ_DailyPlanSlots_Plan_Slot UNIQUE (DailyPlanId, SlotIndex),
        CONSTRAINT FK_DailyPlanSlots_DailyPlan FOREIGN KEY (DailyPlanId)
            REFERENCES portal.DailyPlans (DailyPlanId) ON DELETE CASCADE
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_DailyPlans_PlanDate' AND object_id = OBJECT_ID('portal.DailyPlans'))
BEGIN
    PRINT 'Creating index IX_DailyPlans_PlanDate...';
    CREATE INDEX IX_DailyPlans_PlanDate ON portal.DailyPlans (PlanDate);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_DailyPlanSlots_DailyPlanId' AND object_id = OBJECT_ID('portal.DailyPlanSlots'))
BEGIN
    PRINT 'Creating index IX_DailyPlanSlots_DailyPlanId...';
    CREATE INDEX IX_DailyPlanSlots_DailyPlanId ON portal.DailyPlanSlots (DailyPlanId);
END
GO

PRINT 'Creating/updating trigger TR_DailyPlans_UpdatedAt...';
GO
CREATE OR ALTER TRIGGER portal.TR_DailyPlans_UpdatedAt ON portal.DailyPlans
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p SET UpdatedAt = SYSUTCDATETIME()
    FROM portal.DailyPlans p
    JOIN inserted i ON i.DailyPlanId = p.DailyPlanId;
END
GO

PRINT 'Done.';
GO

GO

-- ===== 06_add_holidays.sql =====
-- Syncaxis Company Portal — moves Holidays from a static frontend file
-- into the database so Admin can add/update/delete them.
--
-- Financial year isn't stored — it's derived from HolidayDate (India's FY
-- runs April-March) both in the API and the frontend, so a holiday's date
-- and which year it's grouped under can never drift apart.
--
-- Run this once in SSMS, connected as a sysadmin, with the query window's
-- database set to SYNCAXIS_PORTAL. Safe to re-run.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF OBJECT_ID('portal.Holidays', 'U') IS NULL
BEGIN
    PRINT 'Creating table portal.Holidays...';
    CREATE TABLE portal.Holidays (
        HolidayId      INT IDENTITY(1,1) NOT NULL,
        HolidayDate    DATE              NOT NULL,
        Name           NVARCHAR(200)     NOT NULL,
        Type           NVARCHAR(20)      NOT NULL,
        CreatedAt      DATETIME2         NOT NULL CONSTRAINT DF_Holidays_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt      DATETIME2         NOT NULL CONSTRAINT DF_Holidays_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Holidays PRIMARY KEY (HolidayId),
        CONSTRAINT CK_Holidays_Type CHECK (Type IN ('National', 'Festival'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Holidays_HolidayDate' AND object_id = OBJECT_ID('portal.Holidays'))
BEGIN
    PRINT 'Creating index IX_Holidays_HolidayDate...';
    CREATE INDEX IX_Holidays_HolidayDate ON portal.Holidays (HolidayDate);
END
GO

PRINT 'Creating/updating trigger TR_Holidays_UpdatedAt...';
GO
CREATE OR ALTER TRIGGER portal.TR_Holidays_UpdatedAt ON portal.Holidays
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE h SET UpdatedAt = SYSUTCDATETIME()
    FROM portal.Holidays h
    JOIN inserted i ON i.HolidayId = h.HolidayId;
END
GO

PRINT 'Done.';
GO

GO

-- ===== 07_add_complaints.sql =====
-- Syncaxis Company Portal — adds the internal Complaints / Issues /
-- Feedback log.
--
-- One portal.Complaints row per entry: who raised it (EmployeeId, nullable
-- — kept even if the employee record is later removed), Category
-- ('Complaint' | 'Issue' | 'Feedback'), Subject, Description, and Status
-- ('Open' | 'In Progress' | 'Resolved' | 'Closed', defaults to 'Open').
--
-- There is no database-level restriction on who can delete a row — the
-- app enforces "only Admin deletes" the same way it already enforces
-- every other admin-only action in this portal: the delete control simply
-- isn't shown outside the Admin section. Everyone shares one portal login,
-- so this is a UI convention, not a hard security boundary — consistent
-- with how the rest of the app already works.
--
-- Run this once in SSMS, connected as a sysadmin, with the query window's
-- database set to SYNCAXIS_PORTAL. Safe to re-run.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF OBJECT_ID('portal.Complaints', 'U') IS NULL
BEGIN
    PRINT 'Creating table portal.Complaints...';
    CREATE TABLE portal.Complaints (
        ComplaintId    INT IDENTITY(1,1) NOT NULL,
        EmployeeId     INT               NULL,
        Category       NVARCHAR(20)      NOT NULL,
        Subject        NVARCHAR(200)     NOT NULL,
        Description    NVARCHAR(MAX)     NOT NULL,
        Status         NVARCHAR(20)      NOT NULL CONSTRAINT DF_Complaints_Status DEFAULT 'Open',
        CreatedAt      DATETIME2         NOT NULL CONSTRAINT DF_Complaints_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt      DATETIME2         NOT NULL CONSTRAINT DF_Complaints_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Complaints PRIMARY KEY (ComplaintId),
        CONSTRAINT FK_Complaints_Employee FOREIGN KEY (EmployeeId)
            REFERENCES portal.Employees (EmployeeId) ON DELETE SET NULL,
        CONSTRAINT CK_Complaints_Category CHECK (Category IN ('Complaint', 'Issue', 'Feedback')),
        CONSTRAINT CK_Complaints_Status CHECK (Status IN ('Open', 'In Progress', 'Resolved', 'Closed'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Complaints_EmployeeId' AND object_id = OBJECT_ID('portal.Complaints'))
BEGIN
    PRINT 'Creating index IX_Complaints_EmployeeId...';
    CREATE INDEX IX_Complaints_EmployeeId ON portal.Complaints (EmployeeId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Complaints_Status' AND object_id = OBJECT_ID('portal.Complaints'))
BEGIN
    PRINT 'Creating index IX_Complaints_Status...';
    CREATE INDEX IX_Complaints_Status ON portal.Complaints (Status);
END
GO

PRINT 'Creating/updating trigger TR_Complaints_UpdatedAt...';
GO
CREATE OR ALTER TRIGGER portal.TR_Complaints_UpdatedAt ON portal.Complaints
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE c SET UpdatedAt = SYSUTCDATETIME()
    FROM portal.Complaints c
    JOIN inserted i ON i.ComplaintId = c.ComplaintId;
END
GO

PRINT 'Done.';
GO

GO

-- ===== 08_add_complaint_history.sql =====
-- Syncaxis Company Portal — adds a status history timeline to Complaints.
--
-- portal.ComplaintHistory is an append-only log: one row per status a
-- complaint has ever been set to (including the initial 'Open' on
-- creation), each with an optional comment and a server-generated
-- timestamp (SYSUTCDATETIME() — never something the caller supplies).
-- Rows are never updated once written, so there's no UpdatedAt column or
-- trigger here, unlike this app's other tables.
--
-- Run this once in SSMS, connected as a sysadmin, with the query window's
-- database set to SYNCAXIS_PORTAL. Safe to re-run.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF OBJECT_ID('portal.ComplaintHistory', 'U') IS NULL
BEGIN
    PRINT 'Creating table portal.ComplaintHistory...';
    CREATE TABLE portal.ComplaintHistory (
        ComplaintHistoryId    INT IDENTITY(1,1) NOT NULL,
        ComplaintId           INT               NOT NULL,
        Status                NVARCHAR(20)      NOT NULL,
        Comment               NVARCHAR(MAX)     NULL,
        CreatedAt             DATETIME2         NOT NULL CONSTRAINT DF_ComplaintHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_ComplaintHistory PRIMARY KEY (ComplaintHistoryId),
        CONSTRAINT FK_ComplaintHistory_Complaint FOREIGN KEY (ComplaintId)
            REFERENCES portal.Complaints (ComplaintId) ON DELETE CASCADE,
        CONSTRAINT CK_ComplaintHistory_Status CHECK (Status IN ('Open', 'In Progress', 'Resolved', 'Closed'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ComplaintHistory_ComplaintId' AND object_id = OBJECT_ID('portal.ComplaintHistory'))
BEGIN
    PRINT 'Creating index IX_ComplaintHistory_ComplaintId...';
    CREATE INDEX IX_ComplaintHistory_ComplaintId ON portal.ComplaintHistory (ComplaintId);
END
GO

-- Backfill: give every existing complaint an initial 'Open' history row
-- (dated to when it was originally created) so nothing looks like it has
-- no history just because it predates this feature.
IF EXISTS (SELECT 1 FROM portal.Complaints c WHERE NOT EXISTS (SELECT 1 FROM portal.ComplaintHistory h WHERE h.ComplaintId = c.ComplaintId))
BEGIN
    PRINT 'Backfilling initial history rows for existing complaints...';
    INSERT INTO portal.ComplaintHistory (ComplaintId, Status, Comment, CreatedAt)
    SELECT c.ComplaintId, 'Open', NULL, c.CreatedAt
    FROM portal.Complaints c
    WHERE NOT EXISTS (SELECT 1 FROM portal.ComplaintHistory h WHERE h.ComplaintId = c.ComplaintId);

    -- If a complaint's current status has already moved past 'Open', add a
    -- second row for its present status too, so the timeline ends where the
    -- complaint actually is — timestamped now, since the real transition
    -- time wasn't recorded before this migration.
    INSERT INTO portal.ComplaintHistory (ComplaintId, Status, Comment, CreatedAt)
    SELECT c.ComplaintId, c.Status, N'(status at time of migration to history tracking)', SYSUTCDATETIME()
    FROM portal.Complaints c
    WHERE c.Status <> 'Open';
END
GO

PRINT 'Done.';
GO

GO

-- ===== 10_add_user_management.sql =====
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

GO

-- ===== 11_add_rbac.sql =====
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

GO

-- ===== 12_add_password_changed_at.sql =====
-- Syncaxis Company Portal — migration 12
--
-- Tracks when each user's password was last set, so the My Account page can
-- show it. Backfills existing users with their CreatedAt (the password was
-- necessarily set at account creation, and we have no earlier record).
-- Safe to re-run.
--
-- Run in SSMS (or sqlcmd) with the query window's database set to
-- SYNCAXIS_PORTAL.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.Users') AND name = 'PasswordChangedAt')
BEGIN
    PRINT 'Adding portal.Users.PasswordChangedAt...';
    ALTER TABLE portal.Users ADD PasswordChangedAt DATETIME2 NULL;
END
GO

-- Separate batch — a batch is compiled as a whole before it runs, so the
-- ALTER TABLE above must already have committed before this statement can
-- reference the new column.
UPDATE portal.Users SET PasswordChangedAt = CreatedAt WHERE PasswordChangedAt IS NULL;
GO

PRINT 'Done.';
GO

GO

-- ===== 13_link_users_employees.sql =====
-- Syncaxis Company Portal — migration 13
--
-- Links each login (portal.Users) to the employee record it belongs to, so
-- the app can show/edit "your own" employee info. Data migration links the
-- accounts created earlier this session by their known username -> employee
-- mapping (explicit pairs, not fuzzy name-matching). Safe to re-run.
--
-- Run in SSMS (or sqlcmd) with the query window's database set to
-- SYNCAXIS_PORTAL.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.Users') AND name = 'EmployeeId')
BEGIN
    PRINT 'Adding portal.Users.EmployeeId...';
    -- ON DELETE SET NULL — removing the employee record unlinks the login
    -- rather than deleting the account itself.
    ALTER TABLE portal.Users ADD EmployeeId INT NULL
        CONSTRAINT FK_Users_Employee FOREIGN KEY REFERENCES portal.Employees (EmployeeId) ON DELETE SET NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_EmployeeId' AND object_id = OBJECT_ID('portal.Users'))
    CREATE INDEX IX_Users_EmployeeId ON portal.Users (EmployeeId);
GO

PRINT 'Linking known users to their employee record...';
UPDATE u
SET u.EmployeeId = e.EmployeeId
FROM portal.Users u
JOIN (VALUES
    ('aditya.bisure',    '0027'),
    ('ashish.patel',     '78'),
    ('syncaxisadmin',    '78'),
    ('atharva.kulkarni', '0075'),
    ('atul.pundkar',     '0046'),
    ('deepak.bisure',    NULL), -- no EmployeeCode on file — matched by name below instead
    ('gargi.kulkarni',   '0067'),
    ('kshitij.bhosale',  '0074'),
    ('mahesh.babar',     '0008'),
    ('mohsin.mulla',     '0052'),
    ('pooja.surywanshi', '0065'),
    ('rahul.fokmare',    '0045'),
    ('sivasankar.s',     '0042'),
    ('shripad.pathak',   '20'),
    ('shubham.kale',     '0038'),
    ('sohail.momin',     NULL) -- no EmployeeCode on file — matched by name below instead
) AS m(Username, EmployeeCode) ON m.Username = u.Username
JOIN portal.Employees e ON e.EmployeeCode = m.EmployeeCode
WHERE m.EmployeeCode IS NOT NULL;

-- The two employees with no EmployeeCode on file — matched by exact Name instead.
UPDATE u SET u.EmployeeId = e.EmployeeId
FROM portal.Users u JOIN portal.Employees e ON e.Name = 'Deepak Bisure'
WHERE u.Username = 'deepak.bisure';

UPDATE u SET u.EmployeeId = e.EmployeeId
FROM portal.Users u JOIN portal.Employees e ON e.Name = 'Sohail Momin'
WHERE u.Username = 'sohail.momin';
GO

PRINT 'Done.';
GO

GO

-- ===== 14_add_employees_authuserid.sql =====
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

GO

-- ===== 16_drop_legacy_identity_tables.sql =====
-- Syncaxis Company Portal — migration 16
--
-- syncaxis-iam integration (see portal-integration-instructions.md, §8.3).
-- Drops Portal's own identity tables — syncaxis-iam is now the sole
-- authority for accounts, roles, and permissions. IRREVERSIBLE beyond this
-- point except via portal_backup_pre_iam_cutover (see
-- 15_backup_pre_iam_cutover.sql) or a full database restore. Do not run
-- this before that backup exists and has been verified.
--
-- Verified before writing this script: every FK referencing these tables
-- is among the seven tables themselves (FK_RolePermissions_Role,
-- FK_UserGroupMembers_User/Group, FK_UserRoles_User/Role,
-- FK_GroupRoles_Group/Role) — dropping in this order doesn't orphan
-- anything else in portal's schema. The only outside column that used to
-- reference this subsystem, portal.Employees.AuthUserId, now points at
-- AuthCenter (syncaxis-iam) instead and has no FK to these tables.
--
-- Dependency-safe order — children before parents.
--
-- Run in SSMS (or sqlcmd) with the query window's database set to
-- SYNCAXIS_PORTAL.

USE SYNCAXIS_PORTAL;
GO
DROP TABLE IF EXISTS portal.RolePermissions;
DROP TABLE IF EXISTS portal.GroupRoles;
DROP TABLE IF EXISTS portal.UserGroupMembers;
DROP TABLE IF EXISTS portal.UserRoles;
DROP TABLE IF EXISTS portal.UserGroups;
DROP TABLE IF EXISTS portal.Roles;
DROP TABLE IF EXISTS portal.Users;
GO

PRINT 'Legacy identity tables dropped.';
GO

GO

-- ===== 18_add_employee_personal_details.sql =====
-- Syncaxis Company Portal — migration 18
--
-- Adds employee personal-details fields (DOB, date of joining, Aadhar/PAN,
-- blood group, current + permanent postal address) directly on
-- portal.Employees, plus a new portal.EmployeeDocuments table for uploaded
-- KYC documents (Aadhar/PAN/Driving Licence/Experience Letter). Files
-- themselves live on disk (DOCS_MOUNT_PATH, see server/src/config/env.js) —
-- this table only tracks what was uploaded and where.
--
-- portal.EmployeeDocuments is insert-only: each upload adds a new row rather
-- than overwriting the previous one, so the "current" document per type is
-- just the most recent row — a lightweight audit trail for free, matching
-- how EmployeeDepartments/ComplaintHistory already keep history in this
-- schema rather than mutating in place.
--
-- Run in SSMS (or sqlcmd) with the query window's database set to
-- SYNCAXIS_PORTAL. Safe to re-run.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.Employees') AND name = 'DateOfBirth')
BEGIN
    PRINT 'Adding portal.Employees.DateOfBirth...';
    ALTER TABLE portal.Employees ADD DateOfBirth DATE NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.Employees') AND name = 'DateOfJoining')
BEGIN
    PRINT 'Adding portal.Employees.DateOfJoining...';
    ALTER TABLE portal.Employees ADD DateOfJoining DATE NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.Employees') AND name = 'AadharNumber')
BEGIN
    PRINT 'Adding portal.Employees.AadharNumber...';
    ALTER TABLE portal.Employees ADD AadharNumber NVARCHAR(20) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.Employees') AND name = 'PanNumber')
BEGIN
    PRINT 'Adding portal.Employees.PanNumber...';
    ALTER TABLE portal.Employees ADD PanNumber NVARCHAR(10) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.Employees') AND name = 'BloodGroup')
BEGIN
    PRINT 'Adding portal.Employees.BloodGroup...';
    ALTER TABLE portal.Employees ADD BloodGroup NVARCHAR(5) NULL;
END
GO

-- Current postal address
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.Employees') AND name = 'CurrentAddressLine1')
BEGIN
    PRINT 'Adding portal.Employees current-address columns...';
    ALTER TABLE portal.Employees ADD
        CurrentAddressLine1 NVARCHAR(200) NULL,
        CurrentAddressLine2 NVARCHAR(200) NULL,
        CurrentCity         NVARCHAR(100) NULL,
        CurrentState        NVARCHAR(100) NULL,
        CurrentPincode      NVARCHAR(6)   NULL,
        CurrentLandmark     NVARCHAR(200) NULL;
END
GO

-- Permanent postal address + "same as current" flag
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.Employees') AND name = 'PermanentAddressLine1')
BEGIN
    PRINT 'Adding portal.Employees permanent-address columns...';
    ALTER TABLE portal.Employees ADD
        PermanentAddressLine1   NVARCHAR(200) NULL,
        PermanentAddressLine2   NVARCHAR(200) NULL,
        PermanentCity           NVARCHAR(100) NULL,
        PermanentState          NVARCHAR(100) NULL,
        PermanentPincode        NVARCHAR(6)   NULL,
        PermanentLandmark       NVARCHAR(200) NULL,
        PermanentSameAsCurrent  BIT           NOT NULL CONSTRAINT DF_Employees_PermanentSameAsCurrent DEFAULT (0);
END
GO

IF OBJECT_ID('portal.EmployeeDocuments', 'U') IS NULL
BEGIN
    PRINT 'Creating portal.EmployeeDocuments...';
    CREATE TABLE portal.EmployeeDocuments (
        EmployeeDocumentId  INT IDENTITY(1,1)  NOT NULL,
        EmployeeId          INT                NOT NULL,
        -- 'Aadhar' | 'PAN' | 'DrivingLicence' | 'ExperienceLetter' — enforced
        -- in the API layer (server/src/routes/employeeDocuments.js), not here.
        DocumentType        NVARCHAR(30)       NOT NULL,
        FileName            NVARCHAR(300)      NOT NULL,
        -- Relative to DOCS_MOUNT_PATH, forward-slash separated so it's
        -- portable between a Windows path and a UNC share.
        FilePath            NVARCHAR(500)      NOT NULL,
        OriginalFileName    NVARCHAR(300)      NULL,
        ContentType         NVARCHAR(100)      NULL,
        FileSizeBytes        INT                NULL,
        UploadedByUserId    INT                NULL,
        UploadedAt          DATETIME2          NOT NULL CONSTRAINT DF_EmployeeDocuments_UploadedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_EmployeeDocuments PRIMARY KEY (EmployeeDocumentId),
        CONSTRAINT FK_EmployeeDocuments_Employee FOREIGN KEY (EmployeeId)
            REFERENCES portal.Employees (EmployeeId) ON DELETE CASCADE
    );
    CREATE INDEX IX_EmployeeDocuments_Employee ON portal.EmployeeDocuments (EmployeeId, DocumentType, UploadedAt DESC);
END
GO

PRINT 'Done.';
GO

GO

-- ===== 19_add_driving_licence_number.sql =====
-- Syncaxis Company Portal — migration 19
--
-- Adds a Driving Licence number field alongside the existing Aadhar/PAN
-- numbers on portal.Employees (the Driving Licence *document* upload
-- already exists via portal.EmployeeDocuments from migration 18 — this is
-- just the identifying number that goes with it).
--
-- Run in SSMS (or sqlcmd) with the query window's database set to
-- SYNCAXIS_PORTAL. Safe to re-run.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.Employees') AND name = 'DrivingLicenceNumber')
BEGIN
    PRINT 'Adding portal.Employees.DrivingLicenceNumber...';
    ALTER TABLE portal.Employees ADD DrivingLicenceNumber NVARCHAR(30) NULL;
END
GO

PRINT 'Done.';
GO

GO

-- ===== 20_add_emergency_contacts_and_family.sql =====
-- Syncaxis Company Portal — migration 20
--
-- Emergency contact moves from a single fixed set of 3 columns on
-- portal.Employees to a proper child table (up to 3 per employee, enforced
-- in the API layer), matching how portal.EmployeeDepartments/
-- EmployeeDocuments already model one-to-many employee data rather than
-- flattening it into more columns.
--
-- The old EmergencyContactName/Relation/Phone columns on portal.Employees
-- are left in place (untouched, no data loss) but are no longer read or
-- written by the API after this change - portal.EmployeeEmergencyContacts
-- is the new source of truth. They can be dropped in a later migration once
-- nothing references them.
--
-- Also adds portal.EmployeeFamilyMembers (up to 6 per employee) - a brand
-- new section, no prior column to migrate from.
--
-- Run in SSMS (or sqlcmd) with the query window's database set to
-- SYNCAXIS_PORTAL. Safe to re-run.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF OBJECT_ID('portal.EmployeeEmergencyContacts', 'U') IS NULL
BEGIN
    PRINT 'Creating portal.EmployeeEmergencyContacts...';
    CREATE TABLE portal.EmployeeEmergencyContacts (
        EmergencyContactId INT IDENTITY(1,1) NOT NULL,
        EmployeeId          INT             NOT NULL,
        Name                NVARCHAR(200)   NOT NULL,
        Relation            NVARCHAR(100)   NULL,
        Phone               NVARCHAR(50)    NULL,
        SortOrder           INT             NOT NULL CONSTRAINT DF_EmployeeEmergencyContacts_SortOrder DEFAULT (0),
        CONSTRAINT PK_EmployeeEmergencyContacts PRIMARY KEY (EmergencyContactId),
        CONSTRAINT FK_EmployeeEmergencyContacts_Employee FOREIGN KEY (EmployeeId)
            REFERENCES portal.Employees (EmployeeId) ON DELETE CASCADE
    );
    CREATE INDEX IX_EmployeeEmergencyContacts_Employee ON portal.EmployeeEmergencyContacts (EmployeeId, SortOrder);
END
GO

IF OBJECT_ID('portal.EmployeeFamilyMembers', 'U') IS NULL
BEGIN
    PRINT 'Creating portal.EmployeeFamilyMembers...';
    CREATE TABLE portal.EmployeeFamilyMembers (
        FamilyMemberId  INT IDENTITY(1,1)  NOT NULL,
        EmployeeId      INT                NOT NULL,
        Name            NVARCHAR(200)      NOT NULL,
        Relation        NVARCHAR(50)       NULL,
        ContactNo       NVARCHAR(50)       NULL,
        SortOrder       INT                NOT NULL CONSTRAINT DF_EmployeeFamilyMembers_SortOrder DEFAULT (0),
        CONSTRAINT PK_EmployeeFamilyMembers PRIMARY KEY (FamilyMemberId),
        CONSTRAINT FK_EmployeeFamilyMembers_Employee FOREIGN KEY (EmployeeId)
            REFERENCES portal.Employees (EmployeeId) ON DELETE CASCADE
    );
    CREATE INDEX IX_EmployeeFamilyMembers_Employee ON portal.EmployeeFamilyMembers (EmployeeId, SortOrder);
END
GO

PRINT 'Done.';
GO

GO

-- ===== 21_add_education_and_experience.sql =====
-- Syncaxis Company Portal — migration 21
--
-- Two more child tables, same pattern as EmployeeEmergencyContacts/
-- EmployeeFamilyMembers (migration 20): unbounded add-a-row lists rather
-- than a fixed number of columns.
--
-- Run in SSMS (or sqlcmd) with the query window's database set to
-- SYNCAXIS_PORTAL. Safe to re-run.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF OBJECT_ID('portal.EmployeeEducation', 'U') IS NULL
BEGIN
    PRINT 'Creating portal.EmployeeEducation...';
    CREATE TABLE portal.EmployeeEducation (
        EducationId     INT IDENTITY(1,1)  NOT NULL,
        EmployeeId      INT                NOT NULL,
        Education       NVARCHAR(200)      NOT NULL,   -- e.g. degree/qualification
        Institution     NVARCHAR(200)      NULL,
        Stream          NVARCHAR(200)      NULL,
        YearOfPassing   NVARCHAR(4)        NULL,
        SortOrder       INT                NOT NULL CONSTRAINT DF_EmployeeEducation_SortOrder DEFAULT (0),
        CONSTRAINT PK_EmployeeEducation PRIMARY KEY (EducationId),
        CONSTRAINT FK_EmployeeEducation_Employee FOREIGN KEY (EmployeeId)
            REFERENCES portal.Employees (EmployeeId) ON DELETE CASCADE
    );
    CREATE INDEX IX_EmployeeEducation_Employee ON portal.EmployeeEducation (EmployeeId, SortOrder);
END
GO

IF OBJECT_ID('portal.EmployeeExperience', 'U') IS NULL
BEGIN
    PRINT 'Creating portal.EmployeeExperience...';
    CREATE TABLE portal.EmployeeExperience (
        ExperienceId    INT IDENTITY(1,1)  NOT NULL,
        EmployeeId      INT                NOT NULL,
        CompanyName     NVARCHAR(200)      NOT NULL,
        Designation     NVARCHAR(200)      NULL,
        StartDate       DATE               NULL,
        EndDate         DATE               NULL,
        SortOrder       INT                NOT NULL CONSTRAINT DF_EmployeeExperience_SortOrder DEFAULT (0),
        CONSTRAINT PK_EmployeeExperience PRIMARY KEY (ExperienceId),
        CONSTRAINT FK_EmployeeExperience_Employee FOREIGN KEY (EmployeeId)
            REFERENCES portal.Employees (EmployeeId) ON DELETE CASCADE
    );
    CREATE INDEX IX_EmployeeExperience_Employee ON portal.EmployeeExperience (EmployeeId, SortOrder);
END
GO

PRINT 'Done.';
GO

GO

-- ===== 22_add_education_experience_documents.sql =====
-- Syncaxis Company Portal — migration 22
--
-- Lets each Education/Experience row carry its own attached document
-- (certificate, offer letter, etc.), the same way portal.Employees carries
-- PhotoUrl directly - denormalized columns on the row itself rather than a
-- generic documents table, since each row owns at most one file.
--
-- This also requires (see the accompanying app code change) that
-- portal.EmployeeEducation/EmployeeExperience rows keep stable IDs across
-- saves - previously the whole set was deleted and reinserted on every
-- save, which would have orphaned any file attached to a specific row.
--
-- Run in SSMS (or sqlcmd) with the query window's database set to
-- SYNCAXIS_PORTAL. Safe to re-run.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.EmployeeEducation') AND name = 'DocumentFileName')
BEGIN
    PRINT 'Adding portal.EmployeeEducation document columns...';
    ALTER TABLE portal.EmployeeEducation ADD
        DocumentFileName         NVARCHAR(300)  NULL,
        DocumentFilePath         NVARCHAR(500)  NULL,
        DocumentOriginalFileName NVARCHAR(300)  NULL,
        DocumentContentType      NVARCHAR(100)  NULL,
        DocumentFileSizeBytes    INT            NULL,
        DocumentUploadedAt       DATETIME2      NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.EmployeeExperience') AND name = 'DocumentFileName')
BEGIN
    PRINT 'Adding portal.EmployeeExperience document columns...';
    ALTER TABLE portal.EmployeeExperience ADD
        DocumentFileName         NVARCHAR(300)  NULL,
        DocumentFilePath         NVARCHAR(500)  NULL,
        DocumentOriginalFileName NVARCHAR(300)  NULL,
        DocumentContentType      NVARCHAR(100)  NULL,
        DocumentFileSizeBytes    INT            NULL,
        DocumentUploadedAt       DATETIME2      NULL;
END
GO

PRINT 'Done.';
GO

GO

-- ===== 23_add_employee_name_parts.sql =====
-- Syncaxis Company Portal — migration 23
--
-- Splits the single Employees.Name field into First/Middle/Last name parts
-- (matching syncaxis-iam's own Users model) for editing, and adds a
-- separate DisplayName field. Name itself stays as-is (NOT NULL, still the
-- column every existing read path - Directory, Avatar initials, search,
-- org chart, exports - uses) and is now computed server-side from the name
-- parts on every save (see routes/employees.js) rather than typed directly.
--
-- Run in SSMS (or sqlcmd) with the query window's database set to
-- SYNCAXIS_PORTAL. Safe to re-run.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.Employees') AND name = 'FirstName')
BEGIN
    PRINT 'Adding portal.Employees name-part columns...';
    ALTER TABLE portal.Employees ADD
        FirstName   NVARCHAR(100) NULL,
        MiddleName  NVARCHAR(100) NULL,
        LastName    NVARCHAR(100) NULL,
        DisplayName NVARCHAR(150) NULL;
END
GO

-- Best-effort backfill so existing employees aren't left blank: the whole
-- existing Name goes into FirstName and mirrors into DisplayName (not split
-- on whitespace - guessing where a name breaks is unreliable) so nothing
-- displays as empty. HR/Admin can split each employee's name properly via
-- the edit form afterwards. Only touches rows not already backfilled, so
-- this is safe to re-run and won't clobber names already split by hand.
UPDATE portal.Employees
SET FirstName = Name, DisplayName = Name
WHERE FirstName IS NULL;
GO

PRINT 'Done.';
GO

GO

-- ===== 24_add_audit_log.sql =====
-- Syncaxis Company Portal — migration 24
--
-- Application-wide audit log: every login/logout/password-change plus every
-- create/update/delete across Employees, Departments, Job Descriptions,
-- Holidays, Complaints, and Daily Plans - written from server/src/lib/audit.js.
-- Mirrors syncaxis-iam's own AuditLog table shape (db/02-syncaxis-iam-schema.sql
-- there), but UserId can't be a real foreign key here - identity now lives in
-- syncaxis-iam's separate AuthCenter database, not in this one - so Username
-- is captured as a snapshot at write time instead of joined at read time.
--
-- Run in SSMS (or sqlcmd) with the query window's database set to
-- SYNCAXIS_PORTAL. Safe to re-run.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE schema_id = SCHEMA_ID('portal') AND name = 'AuditLog')
BEGIN
    PRINT 'Creating portal.AuditLog...';
    CREATE TABLE portal.AuditLog (
        AuditId       BIGINT IDENTITY(1,1) NOT NULL,
        UserId        INT             NULL,       -- syncaxis-iam user id; NULL for a failed login with an unknown username
        Username      NVARCHAR(100)   NULL,       -- snapshot at event time (not joined — Users no longer lives in this DB)
        EventType     NVARCHAR(50)    NOT NULL,   -- 'LOGIN_SUCCESS','LOGIN_FAILURE','LOGOUT','PASSWORD_CHANGED','CREATE','UPDATE','DELETE'
        EntityType    NVARCHAR(50)    NULL,       -- 'Employee','Department','JobDescription','Holiday','Complaint','DailyPlan', ...
        EntityId      NVARCHAR(50)    NULL,
        Detail        NVARCHAR(1000)  NULL,
        IpAddress     VARCHAR(45)     NULL,
        CreatedAt     DATETIME2       NOT NULL CONSTRAINT DF_AuditLog_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_AuditLog PRIMARY KEY (AuditId)
    );
    CREATE INDEX IX_AuditLog_CreatedAt ON portal.AuditLog(CreatedAt DESC);
    CREATE INDEX IX_AuditLog_UserId ON portal.AuditLog(UserId);
END
GO

PRINT 'Done.';
GO

GO

