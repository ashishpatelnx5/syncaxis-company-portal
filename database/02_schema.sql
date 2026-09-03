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
        EmergencyContactName        NVARCHAR(200)        NULL,
        EmergencyContactRelation    NVARCHAR(100)        NULL,
        EmergencyContactPhone       NVARCHAR(50)         NULL,
        CreatedAt                   DATETIME2           NOT NULL CONSTRAINT DF_Employees_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt                   DATETIME2           NOT NULL CONSTRAINT DF_Employees_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Employees PRIMARY KEY (EmployeeId),
        CONSTRAINT UQ_Employees_EmployeeCode UNIQUE (EmployeeCode),
        CONSTRAINT FK_Employees_Manager FOREIGN KEY (ManagerId) REFERENCES portal.Employees (EmployeeId)
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

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EmployeeDepartments_DepartmentId' AND object_id = OBJECT_ID('portal.EmployeeDepartments'))
    CREATE INDEX IX_EmployeeDepartments_DepartmentId ON portal.EmployeeDepartments (DepartmentId);
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
