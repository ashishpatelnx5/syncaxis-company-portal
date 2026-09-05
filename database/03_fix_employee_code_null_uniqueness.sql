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
