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
