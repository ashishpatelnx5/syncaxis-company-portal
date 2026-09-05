-- Syncaxis Company Portal — moves Holidays from a static frontend file
-- into the database so Admin can add/update/delete them.
--
-- Financial year isn't stored — it's derived from HolidayDate (India's FY
-- runs April-March) both in the API and the frontend, so a holiday's date
-- and which year it's grouped under can never drift apart.
--
-- Run this once in SSMS, connected as a sysadmin, with the query window's
-- database set to SYNCAXIS_PORTAL. Safe to re-run.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF OBJECT_ID('portal.Holidays', 'U') IS NULL
BEGIN
    PRINT 'Creating table portal.Holidays...';
    CREATE TABLE portal.Holidays (
        HolidayId      INT IDENTITY(1,1) NOT NULL,
        HolidayDate    DATE              NOT NULL,
        Name           NVARCHAR(200)     NOT NULL,
        Type           NVARCHAR(20)      NOT NULL,
        CreatedAt      DATETIME2         NOT NULL CONSTRAINT DF_Holidays_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt      DATETIME2         NOT NULL CONSTRAINT DF_Holidays_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Holidays PRIMARY KEY (HolidayId),
        CONSTRAINT CK_Holidays_Type CHECK (Type IN ('National', 'Festival'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Holidays_HolidayDate' AND object_id = OBJECT_ID('portal.Holidays'))
BEGIN
    PRINT 'Creating index IX_Holidays_HolidayDate...';
    CREATE INDEX IX_Holidays_HolidayDate ON portal.Holidays (HolidayDate);
END
GO

PRINT 'Creating/updating trigger TR_Holidays_UpdatedAt...';
GO
CREATE OR ALTER TRIGGER portal.TR_Holidays_UpdatedAt ON portal.Holidays
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE h SET UpdatedAt = SYSUTCDATETIME()
    FROM portal.Holidays h
    JOIN inserted i ON i.HolidayId = h.HolidayId;
END
GO

PRINT 'Done.';
GO
