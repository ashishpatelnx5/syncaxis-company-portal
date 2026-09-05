-- Syncaxis Company Portal — adds Daily Plan Sheets.
--
-- Digitizes the paper "Daily Plan Sheet" (employee name, department, date,
-- 8 fixed time-block rows of Plan/Actual/Value-Added/Non-Value-Added
-- hours/Remarks, plus a 0-100 self-assessment score). One portal.DailyPlans
-- row per employee per day, with 8 child portal.DailyPlanSlots rows (one
-- per fixed time block — the block times themselves live in the frontend,
-- src/data/dailyPlanSlots.js, not in the database).
--
-- Run this once in SSMS, connected as a sysadmin, with the query window's
-- database set to SYNCAXIS_PORTAL. Safe to re-run.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF OBJECT_ID('portal.DailyPlans', 'U') IS NULL
BEGIN
    PRINT 'Creating table portal.DailyPlans...';
    CREATE TABLE portal.DailyPlans (
        DailyPlanId      INT IDENTITY(1,1) NOT NULL,
        EmployeeId       INT               NOT NULL,
        PlanDate         DATE              NOT NULL,
        SelfAssessment   INT               NULL,
        CreatedAt        DATETIME2         NOT NULL CONSTRAINT DF_DailyPlans_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt        DATETIME2         NOT NULL CONSTRAINT DF_DailyPlans_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_DailyPlans PRIMARY KEY (DailyPlanId),
        CONSTRAINT UQ_DailyPlans_Employee_Date UNIQUE (EmployeeId, PlanDate),
        CONSTRAINT FK_DailyPlans_Employee FOREIGN KEY (EmployeeId)
            REFERENCES portal.Employees (EmployeeId) ON DELETE CASCADE,
        CONSTRAINT CK_DailyPlans_SelfAssessment CHECK (SelfAssessment IS NULL OR SelfAssessment BETWEEN 0 AND 100)
    );
END
GO

IF OBJECT_ID('portal.DailyPlanSlots', 'U') IS NULL
BEGIN
    PRINT 'Creating table portal.DailyPlanSlots...';
    CREATE TABLE portal.DailyPlanSlots (
        DailyPlanSlotId    INT IDENTITY(1,1) NOT NULL,
        DailyPlanId        INT               NOT NULL,
        SlotIndex          INT               NOT NULL,
        PlanText           NVARCHAR(500)     NULL,
        ActualText         NVARCHAR(500)     NULL,
        ValueAddedHrs      DECIMAL(4,2)      NULL,
        NonValueAddedHrs   DECIMAL(4,2)      NULL,
        Remarks            NVARCHAR(500)     NULL,
        CONSTRAINT PK_DailyPlanSlots PRIMARY KEY (DailyPlanSlotId),
        CONSTRAINT UQ_DailyPlanSlots_Plan_Slot UNIQUE (DailyPlanId, SlotIndex),
        CONSTRAINT FK_DailyPlanSlots_DailyPlan FOREIGN KEY (DailyPlanId)
            REFERENCES portal.DailyPlans (DailyPlanId) ON DELETE CASCADE
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_DailyPlans_PlanDate' AND object_id = OBJECT_ID('portal.DailyPlans'))
BEGIN
    PRINT 'Creating index IX_DailyPlans_PlanDate...';
    CREATE INDEX IX_DailyPlans_PlanDate ON portal.DailyPlans (PlanDate);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_DailyPlanSlots_DailyPlanId' AND object_id = OBJECT_ID('portal.DailyPlanSlots'))
BEGIN
    PRINT 'Creating index IX_DailyPlanSlots_DailyPlanId...';
    CREATE INDEX IX_DailyPlanSlots_DailyPlanId ON portal.DailyPlanSlots (DailyPlanId);
END
GO

PRINT 'Creating/updating trigger TR_DailyPlans_UpdatedAt...';
GO
CREATE OR ALTER TRIGGER portal.TR_DailyPlans_UpdatedAt ON portal.DailyPlans
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p SET UpdatedAt = SYSUTCDATETIME()
    FROM portal.DailyPlans p
    JOIN inserted i ON i.DailyPlanId = p.DailyPlanId;
END
GO

PRINT 'Done.';
GO
