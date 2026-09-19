// Company applications shown on the Home and Applications pages.
// URLs come from .env (VITE_*) so they can differ per environment without a
// code change; the values here are the fallback used if a variable is unset.
export const apps = [
  {
    id: 'webmail',
    name: 'Webmail',
    description: 'Send and receive company email',
    url: import.meta.env.VITE_WEBMAIL_URL || 'https://webmail.syncaxis.com/',
    icon: 'mail',
  },
  {
    id: 'erp',
    name: 'ERP',
    description: 'Enterprise resource planning system',
    url: import.meta.env.VITE_ERP_URL || 'http://erp.syncaxis.com/login',
    icon: 'erp',
  },
  {
    id: 'erp-dashboard',
    name: 'ERP Dashboard',
    description: 'ERP reports and dashboard',
    url: import.meta.env.VITE_ERP_DASHBOARD_URL || 'http://192.168.3.9:8055/',
    icon: 'grid',
    // Opts into the SSO handoff in AppCard.jsx instead of a plain link - the
    // dashboard's own backend exchanges the handoff code server-to-server
    // via /api/auth/sso/exchange, same mechanism as the Inquiry Portal below.
    ssoHandoff: true,
  },
  {
    id: 'greythr',
    name: 'GreytHR',
    description: 'Leave, attendance, and payroll management',
    url: import.meta.env.VITE_GREYTHR_URL || 'https://syncaxis.greythr.com/',
    icon: 'hr',
  },
  {
    id: 'leads-tracker',
    name: 'Inquiry Portal',
    description: 'Submit and track inquiries',
    url: import.meta.env.VITE_INQUIRY_URL || 'http://localhost:8057/',
    icon: 'inquiry',
    // Opts into the SSO handoff in AppCard.jsx instead of a plain link -
    // the Inquiry Portal has its own backend that can exchange a handoff
    // code (see /api/auth/sso/issue + /sso/exchange), unlike the other apps
    // here which are just external systems with their own separate logins.
    ssoHandoff: true,
  },
  {
    id: 'iam-admin',
    name: 'IAM Admin',
    description: 'Manage users, roles, and permissions',
    // Points straight at the login route (not just the origin) - that's the
    // one route on syncaxis-iam's side that reads ?ssoCode and exchanges it,
    // and it needs the query string to survive, unlike '/' which just
    // redirects to the (auth-gated) dashboard and would drop it.
    url: import.meta.env.VITE_IAM_ADMIN_URL || 'http://localhost:8054/admin-ui/login',
    icon: 'shield',
    // Opts into the SSO handoff in AppCard.jsx instead of a plain link -
    // syncaxis-iam is the identity provider itself, so its admin console
    // exchanges the handoff code in-process rather than via a separate
    // backend calling back into Portal, unlike the other ssoHandoff apps.
    ssoHandoff: true,
    // Not grantable via the permission matrix like the apps above - visible
    // only to full-access admins (see Home.jsx / Applications.jsx), so it's
    // excluded from registerIamPermissions.js's manifest too.
    adminOnly: true,
  },
]
