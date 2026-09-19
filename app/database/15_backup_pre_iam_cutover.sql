-- Syncaxis Company Portal — migration 15
--
-- syncaxis-iam integration (see portal-integration-instructions.md, §8.2).
-- Snapshot of the identity tables before they're dropped in
-- 16_drop_legacy_identity_tables.sql. Keep this backup schema for at least
-- a few weeks after cutover before considering dropping it too.
--
-- Run in SSMS (or sqlcmd) with the query window's database set to
-- SYNCAXIS_PORTAL.

USE SYNCAXIS_PORTAL;
GO

CREATE SCHEMA portal_backup_pre_iam_cutover;
GO
SELECT * INTO portal_backup_pre_iam_cutover.Users FROM portal.Users;
SELECT * INTO portal_backup_pre_iam_cutover.Roles FROM portal.Roles;
SELECT * INTO portal_backup_pre_iam_cutover.UserRoles FROM portal.UserRoles;
SELECT * INTO portal_backup_pre_iam_cutover.UserGroups FROM portal.UserGroups;
SELECT * INTO portal_backup_pre_iam_cutover.UserGroupMembers FROM portal.UserGroupMembers;
SELECT * INTO portal_backup_pre_iam_cutover.GroupRoles FROM portal.GroupRoles;
SELECT * INTO portal_backup_pre_iam_cutover.RolePermissions FROM portal.RolePermissions;
GO

PRINT 'Backup complete.';
GO
