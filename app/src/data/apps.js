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
  },
  {
    id: 'greythr',
    name: 'GreytHR',
    description: 'Leave, attendance, and payroll management',
    url: import.meta.env.VITE_GREYTHR_URL || 'https://syncaxis.greythr.com/',
    icon: 'hr',
  },
  {
    id: 'inquiry',
    name: 'Inquiry Portal',
    description: 'Submit and track inquiries',
    url: import.meta.env.VITE_INQUIRY_URL || 'https://inquiry.syncaxis.com/',
    icon: 'inquiry',
  },
]
