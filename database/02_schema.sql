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
        UserId          INT IDENTITY(1,1) NOT NULL,
        Username        NVARCHAR(100)      NOT NULL,
        PasswordHash    NVARCHAR(255)      NOT NULL,
        DisplayName     NVARCHAR(200)       NULL,
        Role            NVARCHAR(50)       NOT NULL CONSTRAINT DF_Users_Role DEFAULT 'admin',
        IsActive        BIT                NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
        LastLoginAt     DATETIME2           NULL,
        CreatedAt       DATETIME2          NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt       DATETIME2          NOT NULL CONSTRAINT DF_Users_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Users PRIMARY KEY (UserId),
        CONSTRAINT UQ_Users_Username UNIQUE (Username)
    );
END
GO

-- ============================================================
-- Indexes
-- ============================================================

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
