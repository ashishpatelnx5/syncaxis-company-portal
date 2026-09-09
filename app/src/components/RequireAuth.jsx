import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ComplaintsProvider } from '../context/ComplaintsContext.jsx'
import { DepartmentsProvider } from '../context/DepartmentsContext.jsx'
import { EmployeesProvider } from '../context/EmployeesContext.jsx'
import { HolidaysProvider } from '../context/HolidaysContext.jsx'
import { JobDescriptionsProvider } from '../context/JobDescriptionsContext.jsx'
import { useAuth } from '../context/useAuth'

export default function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // These providers used to wrap the whole app (in main.jsx), so they
  // mounted — and fired their first fetch — before the user had a token,
  // getting back empty/error data that never refreshed after logging in
  // (nothing remounted them). Mounting them here instead means their first
  // fetch always has a valid token, and logging out/in remounts them fresh.
  return (
    <DepartmentsProvider>
      <JobDescriptionsProvider>
        <EmployeesProvider>
          <HolidaysProvider>
            <ComplaintsProvider>
              <Outlet />
            </ComplaintsProvider>
          </HolidaysProvider>
        </EmployeesProvider>
      </JobDescriptionsProvider>
    </DepartmentsProvider>
  )
}
