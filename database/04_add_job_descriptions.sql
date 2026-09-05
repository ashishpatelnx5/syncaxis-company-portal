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
