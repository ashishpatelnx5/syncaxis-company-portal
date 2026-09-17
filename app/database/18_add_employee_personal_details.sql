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
