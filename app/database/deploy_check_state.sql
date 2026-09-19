-- Syncaxis Company Portal — read-only schema state check.
-- Run against SYNCAXIS_PORTAL on BOTH local and production, then compare the
-- two result sets. Makes no changes. Tells you which migrations still need
-- to be applied (03-24; 09 does not exist).

USE SYNCAXIS_PORTAL;
GO
SET NOCOUNT ON;

SELECT m.Migration, m.Applied
FROM (VALUES
  ('03 employee code unique index',   CASE WHEN EXISTS (SELECT 1 FROM sys.indexes WHERE name='UX_Employees_EmployeeCode') THEN 1 ELSE 0 END),
  ('04 job descriptions',             CASE WHEN OBJECT_ID('portal.JobDescriptions') IS NOT NULL THEN 1 ELSE 0 END),
  ('05 daily plans',                  CASE WHEN OBJECT_ID('portal.DailyPlans') IS NOT NULL THEN 1 ELSE 0 END),
  ('06 holidays',                     CASE WHEN OBJECT_ID('portal.Holidays') IS NOT NULL THEN 1 ELSE 0 END),
  ('07 complaints',                   CASE WHEN OBJECT_ID('portal.Complaints') IS NOT NULL THEN 1 ELSE 0 END),
  ('08 complaint history',            CASE WHEN OBJECT_ID('portal.ComplaintHistory') IS NOT NULL THEN 1 ELSE 0 END),
  ('10/11 legacy users+RBAC (old)',   CASE WHEN OBJECT_ID('portal.Roles') IS NOT NULL THEN 1 ELSE 0 END),
  ('12 Users.PasswordChangedAt',      CASE WHEN COL_LENGTH('portal.Users','PasswordChangedAt') IS NOT NULL THEN 1 ELSE 0 END),
  ('13 Users.EmployeeId',             CASE WHEN COL_LENGTH('portal.Users','EmployeeId') IS NOT NULL THEN 1 ELSE 0 END),
  ('14 Employees.AuthUserId',         CASE WHEN COL_LENGTH('portal.Employees','AuthUserId') IS NOT NULL THEN 1 ELSE 0 END),
  ('15 IAM backup schema exists',     CASE WHEN SCHEMA_ID('portal_backup_pre_iam_cutover') IS NOT NULL THEN 1 ELSE 0 END),
  ('16 legacy identity tables DROPPED', CASE WHEN OBJECT_ID('portal.Users') IS NULL AND OBJECT_ID('portal.Roles') IS NULL THEN 1 ELSE 0 END),
  ('17 IAM backup schema DROPPED',    CASE WHEN SCHEMA_ID('portal_backup_pre_iam_cutover') IS NULL THEN 1 ELSE 0 END),
  ('18 personal details + documents', CASE WHEN COL_LENGTH('portal.Employees','DateOfBirth') IS NOT NULL AND OBJECT_ID('portal.EmployeeDocuments') IS NOT NULL THEN 1 ELSE 0 END),
  ('19 driving licence number',       CASE WHEN COL_LENGTH('portal.Employees','DrivingLicenceNumber') IS NOT NULL THEN 1 ELSE 0 END),
  ('20 emergency contacts + family',  CASE WHEN OBJECT_ID('portal.EmployeeEmergencyContacts') IS NOT NULL AND OBJECT_ID('portal.EmployeeFamilyMembers') IS NOT NULL THEN 1 ELSE 0 END),
  ('21 education + experience',       CASE WHEN OBJECT_ID('portal.EmployeeEducation') IS NOT NULL AND OBJECT_ID('portal.EmployeeExperience') IS NOT NULL THEN 1 ELSE 0 END),
  ('22 education/experience documents', CASE WHEN COL_LENGTH('portal.EmployeeEducation','DocumentFileName') IS NOT NULL AND COL_LENGTH('portal.EmployeeExperience','DocumentFileName') IS NOT NULL THEN 1 ELSE 0 END),
  ('23 employee name parts',          CASE WHEN COL_LENGTH('portal.Employees','FirstName') IS NOT NULL THEN 1 ELSE 0 END),
  ('24 audit log',                    CASE WHEN OBJECT_ID('portal.AuditLog') IS NOT NULL THEN 1 ELSE 0 END)
) AS m(Migration, Applied);

-- Full column inventory, for a line-by-line diff between local and production.
SELECT t.name AS TableName, c.name AS ColumnName, ty.name AS DataType, c.max_length, c.is_nullable
FROM sys.tables t
JOIN sys.columns c ON c.object_id = t.object_id
JOIN sys.types ty ON ty.user_type_id = c.user_type_id
WHERE t.schema_id = SCHEMA_ID('portal')
ORDER BY t.name, c.column_id;
GO
