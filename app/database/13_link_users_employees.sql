-- Syncaxis Company Portal — migration 13
--
-- Links each login (portal.Users) to the employee record it belongs to, so
-- the app can show/edit "your own" employee info. Data migration links the
-- accounts created earlier this session by their known username -> employee
-- mapping (explicit pairs, not fuzzy name-matching). Safe to re-run.
--
-- Run in SSMS (or sqlcmd) with the query window's database set to
-- SYNCAXIS_PORTAL.

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('portal.Users') AND name = 'EmployeeId')
BEGIN
    PRINT 'Adding portal.Users.EmployeeId...';
    -- ON DELETE SET NULL — removing the employee record unlinks the login
    -- rather than deleting the account itself.
    ALTER TABLE portal.Users ADD EmployeeId INT NULL
        CONSTRAINT FK_Users_Employee FOREIGN KEY REFERENCES portal.Employees (EmployeeId) ON DELETE SET NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_EmployeeId' AND object_id = OBJECT_ID('portal.Users'))
    CREATE INDEX IX_Users_EmployeeId ON portal.Users (EmployeeId);
GO

PRINT 'Linking known users to their employee record...';
UPDATE u
SET u.EmployeeId = e.EmployeeId
FROM portal.Users u
JOIN (VALUES
    ('aditya.bisure',    '0027'),
    ('ashish.patel',     '78'),
    ('syncaxisadmin',    '78'),
    ('atharva.kulkarni', '0075'),
    ('atul.pundkar',     '0046'),
    ('deepak.bisure',    NULL), -- no EmployeeCode on file — matched by name below instead
    ('gargi.kulkarni',   '0067'),
    ('kshitij.bhosale',  '0074'),
    ('mahesh.babar',     '0008'),
    ('mohsin.mulla',     '0052'),
    ('pooja.surywanshi', '0065'),
    ('rahul.fokmare',    '0045'),
    ('sivasankar.s',     '0042'),
    ('shripad.pathak',   '20'),
    ('shubham.kale',     '0038'),
    ('sohail.momin',     NULL) -- no EmployeeCode on file — matched by name below instead
) AS m(Username, EmployeeCode) ON m.Username = u.Username
JOIN portal.Employees e ON e.EmployeeCode = m.EmployeeCode
WHERE m.EmployeeCode IS NOT NULL;

-- The two employees with no EmployeeCode on file — matched by exact Name instead.
UPDATE u SET u.EmployeeId = e.EmployeeId
FROM portal.Users u JOIN portal.Employees e ON e.Name = 'Deepak Bisure'
WHERE u.Username = 'deepak.bisure';

UPDATE u SET u.EmployeeId = e.EmployeeId
FROM portal.Users u JOIN portal.Employees e ON e.Name = 'Sohail Momin'
WHERE u.Username = 'sohail.momin';
GO

PRINT 'Done.';
GO
