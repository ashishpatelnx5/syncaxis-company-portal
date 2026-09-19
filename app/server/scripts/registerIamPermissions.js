// One-time (idempotent — safe to re-run) registration of Portal's full
// permission manifest with syncaxis-iam, so every page/tile Portal actually
// has — not just the ones that happened to have grants already — shows up
// in syncaxis-iam's admin permission matrix. See
// portal-integration-instructions.md §6.4. Manifest is built from the same
// source files the frontend/backend use (permissions.js, apps.js), so it
// can't drift from what Portal actually has.
//
// Needs a syncaxis-iam token for a user holding iam.admin.manage. Provide
// either IAM_ADMIN_TOKEN directly, or IAM_ADMIN_USERNAME + IAM_ADMIN_PASSWORD
// to have this script log in and obtain one.
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pagePermissions } from '../../src/data/permissions.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IAM_API_URL = process.env.IAM_API_URL
if (!IAM_API_URL) throw new Error('Missing IAM_API_URL')

// apps.js reads import.meta.env.VITE_* (Vite-only) at module scope, so a
// plain Node script can't import it directly — its ids/names are parsed out
// of the source text instead, without executing it. adminOnly apps (e.g.
// IAM Admin) are skipped - they're gated on isAdmin directly (see Home.jsx /
// Applications.jsx), not on a grantable permission, so they have no
// 'portal.<id>.access' key to register.
function readAppManifest() {
  const src = fs.readFileSync(path.resolve(__dirname, '../../src/data/apps.js'), 'utf8')
  const apps = []
  const blockRe = /\{\s*id:\s*'([a-z0-9-]+)'[\s\S]*?\n {2}\}/g
  let match
  while ((match = blockRe.exec(src))) {
    const block = match[0]
    if (/adminOnly:\s*true/.test(block)) continue
    const name = block.match(/name:\s*'([^']+)'/)?.[1]
    if (name) apps.push({ id: match[1], name })
  }
  return apps
}

// admin-* pages are 'manage', everything else is 'view' — matches every key
// currently in permissions.js, including the admin-leads-tracker page kept
// for the tile now merged into 'leads-tracker' (see the apps.js entry below).
function buildManifest() {
  const permissions = pagePermissions.map(({ key, label }) => ({
    key: `portal.${key}.${key.startsWith('admin') ? 'manage' : 'view'}`,
    description: label,
  }))
  for (const { id, name } of readAppManifest()) {
    permissions.push({ key: `portal.${id}.access`, description: `Access the ${name} tile` })
  }
  return permissions
}

async function getAdminToken() {
  if (process.env.IAM_ADMIN_TOKEN) return process.env.IAM_ADMIN_TOKEN

  const username = process.env.IAM_ADMIN_USERNAME
  const password = process.env.IAM_ADMIN_PASSWORD
  if (!username || !password) {
    throw new Error('Set IAM_ADMIN_TOKEN, or IAM_ADMIN_USERNAME + IAM_ADMIN_PASSWORD, to authenticate against syncaxis-iam.')
  }

  const res = await fetch(`${IAM_API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`syncaxis-iam login failed: ${data.error || res.status}`)
  return data.token
}

async function main() {
  const permissions = buildManifest()
  console.log(`Registering ${permissions.length} permission keys with syncaxis-iam (${IAM_API_URL}):`)
  for (const p of permissions) console.log(`  ${p.key} — ${p.description}`)

  const token = await getAdminToken()
  const res = await fetch(`${IAM_API_URL}/admin/apps/portal/permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ permissions }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(`Registration failed (${res.status}): ${data.error || 'unknown error'}`)
  }
  console.log('Done.')
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
