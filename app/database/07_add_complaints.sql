-- Syncaxis Company Portal — adds the internal Complaints / Issues /
-- Feedback log.
--
-- One portal.Complaints row per entry: who raised it (EmployeeId, nullable
-- — kept even if the employee record is later removed), Category
-- ('Complaint' | 'Issue' | 'Feedback'), Subject, Description, and Status
-- ('Open' | 'In Progress' | 'Resolved' | 'Closed', defaults to 'Open').
--
-- There is no database-level restriction on who can delete a row — the
-- app enforces "only Admin deletes" the same way it already enforces
-- every other admin-only action in this portal: the delete control simply
-- isn't shown outside the Admin section. Everyone shares one portal login,
-- so this is a UI convention, not a hard security boundary — consistent
-- with how the rest of the app already works.
--
-- Run this once in SSMS, connected as a sysadmin, with the query window's
-- database set to SYNCAXIS_PORTAL. Safe to re-run.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF OBJECT_ID('portal.Complaints', 'U') IS NULL
BEGIN
    PRINT 'Creating table portal.Complaints...';
    CREATE TABLE portal.Complaints (
        ComplaintId    INT IDENTITY(1,1) NOT NULL,
        EmployeeId     INT               NULL,
        Category       NVARCHAR(20)      NOT NULL,
        Subject        NVARCHAR(200)     NOT NULL,
        Description    NVARCHAR(MAX)     NOT NULL,
        Status         NVARCHAR(20)      NOT NULL CONSTRAINT DF_Complaints_Status DEFAULT 'Open',
        CreatedAt      DATETIME2         NOT NULL CONSTRAINT DF_Complaints_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt      DATETIME2         NOT NULL CONSTRAINT DF_Complaints_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Complaints PRIMARY KEY (ComplaintId),
        CONSTRAINT FK_Complaints_Employee FOREIGN KEY (EmployeeId)
            REFERENCES portal.Employees (EmployeeId) ON DELETE SET NULL,
        CONSTRAINT CK_Complaints_Category CHECK (Category IN ('Complaint', 'Issue', 'Feedback')),
        CONSTRAINT CK_Complaints_Status CHECK (Status IN ('Open', 'In Progress', 'Resolved', 'Closed'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Complaints_EmployeeId' AND object_id = OBJECT_ID('portal.Complaints'))
BEGIN
    PRINT 'Creating index IX_Complaints_EmployeeId...';
    CREATE INDEX IX_Complaints_EmployeeId ON portal.Complaints (EmployeeId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Complaints_Status' AND object_id = OBJECT_ID('portal.Complaints'))
BEGIN
    PRINT 'Creating index IX_Complaints_Status...';
    CREATE INDEX IX_Complaints_Status ON portal.Complaints (Status);
END
GO

PRINT 'Creating/updating trigger TR_Complaints_UpdatedAt...';
GO
CREATE OR ALTER TRIGGER portal.TR_Complaints_UpdatedAt ON portal.Complaints
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE c SET UpdatedAt = SYSUTCDATETIME()
    FROM portal.Complaints c
    JOIN inserted i ON i.ComplaintId = c.ComplaintId;
END
GO

PRINT 'Done.';
GO
