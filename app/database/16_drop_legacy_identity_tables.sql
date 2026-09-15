-- Syncaxis Company Portal — migration 16
--
-- syncaxis-iam integration (see portal-integration-instructions.md, §8.3).
-- Drops Portal's own identity tables — syncaxis-iam is now the sole
-- authority for accounts, roles, and permissions. IRREVERSIBLE beyond this
-- point except via portal_backup_pre_iam_cutover (see
-- 15_backup_pre_iam_cutover.sql) or a full database restore. Do not run
-- this before that backup exists and has been verified.
--
-- Verified before writing this script: every FK referencing these tables
-- is among the seven tables themselves (FK_RolePermissions_Role,
-- FK_UserGroupMembers_User/Group, FK_UserRoles_User/Role,
-- FK_GroupRoles_Group/Role) — dropping in this order doesn't orphan
-- anything else in portal's schema. The only outside column that used to
-- reference this subsystem, portal.Employees.AuthUserId, now points at
-- AuthCenter (syncaxis-iam) instead and has no FK to these tables.
--
-- Dependency-safe order — children before parents.
--
-- Run in SSMS (or sqlcmd) with the query window's database set to
-- SYNCAXIS_PORTAL.

USE SYNCAXIS_PORTAL;
GO
DROP TABLE IF EXISTS portal.RolePermissions;
DROP TABLE IF EXISTS portal.GroupRoles;
DROP TABLE IF EXISTS portal.UserGroupMembers;
DROP TABLE IF EXISTS portal.UserRoles;
DROP TABLE IF EXISTS portal.UserGroups;
DROP TABLE IF EXISTS portal.Roles;
DROP TABLE IF EXISTS portal.Users;
GO

PRINT 'Legacy identity tables dropped.';
GO
