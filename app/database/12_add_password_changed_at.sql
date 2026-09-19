-- Syncaxis Company Portal — migration 12
--
-- Tracks when each user's password was last set, so the My Account page can
-- show it. Backfills existing users with their CreatedAt (the password was
-- necessarily set at account creation, and we have no earlier record).
-- Safe to re-run.
--
-- Run in SSMS (or sqlcmd) with the query window's database set to
-- SYNCAXIS_PORTAL.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.Users') AND name = 'PasswordChangedAt')
BEGIN
    PRINT 'Adding portal.Users.PasswordChangedAt...';
    ALTER TABLE portal.Users ADD PasswordChangedAt DATETIME2 NULL;
END
GO

-- Separate batch — a batch is compiled as a whole before it runs, so the
-- ALTER TABLE above must already have committed before this statement can
-- reference the new column.
UPDATE portal.Users SET PasswordChangedAt = CreatedAt WHERE PasswordChangedAt IS NULL;
GO

PRINT 'Done.';
GO
