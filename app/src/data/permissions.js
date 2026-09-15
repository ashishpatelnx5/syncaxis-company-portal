// Grantable page permissions for the 'user' role — an 'admin' always has
// full access and never consults this list. Keys mirror the routes in
// App.jsx / navItems in Layout.jsx; keep them in sync when adding a page.
// The same keys are used server-side (see server/src/middleware/auth.js and
// each route file) — this is the one place both sides should match against.
export const pagePermissions = [
  { key: 'directory', label: 'Directory' },
  { key: 'hierarchy', label: 'Org Chart' },
  { key: 'applications', label: 'Applications' },
  { key: 'holidays', label: 'Holidays' },
  { key: 'job-descriptions', label: 'Job Descriptions' },
  { key: 'daily-plan', label: 'Daily Plan' },
  { key: 'complaints', label: 'Complaints & Feedback' },
  { key: 'admin-employees', label: 'Admin: Employees' },
  { key: 'admin-departments', label: 'Admin: Departments' },
  { key: 'admin-job-descriptions', label: 'Admin: Job Descriptions' },
  { key: 'admin-daily-plans', label: 'Admin: Team Daily Plans' },
  { key: 'admin-holidays', label: 'Admin: Holidays' },
  { key: 'admin-complaints', label: 'Admin: Complaints & Feedback' },
  { key: 'admin-leads-tracker', label: 'Admin: Leads Tracker' },
]
