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
]
