-- Syncaxis Company Portal — adds a status history timeline to Complaints.
--
-- portal.ComplaintHistory is an append-only log: one row per status a
-- complaint has ever been set to (including the initial 'Open' on
-- creation), each with an optional comment and a server-generated
-- timestamp (SYSUTCDATETIME() — never something the caller supplies).
-- Rows are never updated once written, so there's no UpdatedAt column or
-- trigger here, unlike this app's other tables.
--
-- Run this once in SSMS, connected as a sysadmin, with the query window's
-- database set to SYNCAXIS_PORTAL. Safe to re-run.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF OBJECT_ID('portal.ComplaintHistory', 'U') IS NULL
BEGIN
    PRINT 'Creating table portal.ComplaintHistory...';
    CREATE TABLE portal.ComplaintHistory (
        ComplaintHistoryId    INT IDENTITY(1,1) NOT NULL,
        ComplaintId           INT               NOT NULL,
        Status                NVARCHAR(20)      NOT NULL,
        Comment               NVARCHAR(MAX)     NULL,
        CreatedAt             DATETIME2         NOT NULL CONSTRAINT DF_ComplaintHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_ComplaintHistory PRIMARY KEY (ComplaintHistoryId),
        CONSTRAINT FK_ComplaintHistory_Complaint FOREIGN KEY (ComplaintId)
            REFERENCES portal.Complaints (ComplaintId) ON DELETE CASCADE,
        CONSTRAINT CK_ComplaintHistory_Status CHECK (Status IN ('Open', 'In Progress', 'Resolved', 'Closed'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ComplaintHistory_ComplaintId' AND object_id = OBJECT_ID('portal.ComplaintHistory'))
BEGIN
    PRINT 'Creating index IX_ComplaintHistory_ComplaintId...';
    CREATE INDEX IX_ComplaintHistory_ComplaintId ON portal.ComplaintHistory (ComplaintId);
END
GO

-- Backfill: give every existing complaint an initial 'Open' history row
-- (dated to when it was originally created) so nothing looks like it has
-- no history just because it predates this feature.
IF EXISTS (SELECT 1 FROM portal.Complaints c WHERE NOT EXISTS (SELECT 1 FROM portal.ComplaintHistory h WHERE h.ComplaintId = c.ComplaintId))
BEGIN
    PRINT 'Backfilling initial history rows for existing complaints...';
    INSERT INTO portal.ComplaintHistory (ComplaintId, Status, Comment, CreatedAt)
    SELECT c.ComplaintId, 'Open', NULL, c.CreatedAt
    FROM portal.Complaints c
    WHERE NOT EXISTS (SELECT 1 FROM portal.ComplaintHistory h WHERE h.ComplaintId = c.ComplaintId);

    -- If a complaint's current status has already moved past 'Open', add a
    -- second row for its present status too, so the timeline ends where the
    -- complaint actually is — timestamped now, since the real transition
    -- time wasn't recorded before this migration.
    INSERT INTO portal.ComplaintHistory (ComplaintId, Status, Comment, CreatedAt)
    SELECT c.ComplaintId, c.Status, N'(status at time of migration to history tracking)', SYSUTCDATETIME()
    FROM portal.Complaints c
    WHERE c.Status <> 'Open';
END
GO

PRINT 'Done.';
GO
