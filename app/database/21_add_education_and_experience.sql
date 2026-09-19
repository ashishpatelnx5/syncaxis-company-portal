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
