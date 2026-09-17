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
