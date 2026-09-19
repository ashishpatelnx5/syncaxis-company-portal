import { Navigate, useNavigate, useParams } from 'react-router-dom'
import EmployeeForm from '../components/EmployeeForm'
import { useEmployees } from '../context/useEmployees'

// Full-page counterpart to EmployeeForm's modal variant (used for "Add
// employee") - editing an existing employee's 6-tab form works better as
// its own page than a popup. Mounted at /admin/employees/:id/edit.
export default function EmployeeEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { employees, isLoading } = useEmployees()
  const employee = employees.find((e) => String(e.id) === id)

  if (isLoading) return null
  if (!employee) return <Navigate to="/admin/employees" replace />

  return <EmployeeForm employee={employee} onClose={() => navigate(`/admin/employees/${employee.id}`)} variant="page" />
}
