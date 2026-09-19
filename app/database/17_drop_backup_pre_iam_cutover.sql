-- Syncaxis Company Portal — migration 17
--
-- Drops the portal_backup_pre_iam_cutover schema taken in
-- 15_backup_pre_iam_cutover.sql just before the legacy identity tables were
-- dropped (16_drop_legacy_identity_tables.sql). Dropped here at the
-- explicit request of whoever ran this migration, ahead of the "a few
-- weeks" retention portal-integration-instructions.md §8.2/§11 suggested —
-- there is no recovery path for this data beyond a full database restore
-- once this runs.
--
-- Run in SSMS (or sqlcmd) with the query window's database set to
-- SYNCAXIS_PORTAL.

USE SYNCAXIS_PORTAL;
GO
DROP TABLE IF EXISTS portal_backup_pre_iam_cutover.RolePermissions;
DROP TABLE IF EXISTS portal_backup_pre_iam_cutover.GroupRoles;
DROP TABLE IF EXISTS portal_backup_pre_iam_cutover.UserGroupMembers;
DROP TABLE IF EXISTS portal_backup_pre_iam_cutover.UserRoles;
DROP TABLE IF EXISTS portal_backup_pre_iam_cutover.UserGroups;
DROP TABLE IF EXISTS portal_backup_pre_iam_cutover.Roles;
DROP TABLE IF EXISTS portal_backup_pre_iam_cutover.Users;
GO
DROP SCHEMA IF EXISTS portal_backup_pre_iam_cutover;
GO

PRINT 'portal_backup_pre_iam_cutover schema dropped.';
GO
