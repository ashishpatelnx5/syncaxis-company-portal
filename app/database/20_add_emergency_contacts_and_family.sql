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
