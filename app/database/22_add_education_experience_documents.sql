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
