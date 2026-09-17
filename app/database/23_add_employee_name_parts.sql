-- Syncaxis Company Portal — migration 23
--
-- Splits the single Employees.Name field into First/Middle/Last name parts
-- (matching syncaxis-iam's own Users model) for editing, and adds a
-- separate DisplayName field. Name itself stays as-is (NOT NULL, still the
-- column every existing read path - Directory, Avatar initials, search,
-- org chart, exports - uses) and is now computed server-side from the name
-- parts on every save (see routes/employees.js) rather than typed directly.
--
-- Run in SSMS (or sqlcmd) with the query window's database set to
-- SYNCAXIS_PORTAL. Safe to re-run.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.Employees') AND name = 'FirstName')
BEGIN
    PRINT 'Adding portal.Employees name-part columns...';
    ALTER TABLE portal.Employees ADD
        FirstName   NVARCHAR(100) NULL,
        MiddleName  NVARCHAR(100) NULL,
        LastName    NVARCHAR(100) NULL,
        DisplayName NVARCHAR(150) NULL;
END
GO

-- Best-effort backfill so existing employees aren't left blank: the whole
-- existing Name goes into FirstName and mirrors into DisplayName (not split
-- on whitespace - guessing where a name breaks is unreliable) so nothing
-- displays as empty. HR/Admin can split each employee's name properly via
-- the edit form afterwards. Only touches rows not already backfilled, so
-- this is safe to re-run and won't clobber names already split by hand.
UPDATE portal.Employees
SET FirstName = Name, DisplayName = Name
WHERE FirstName IS NULL;
GO

PRINT 'Done.';
GO
