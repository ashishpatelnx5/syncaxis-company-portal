import { Navigate, useNavigate, useParams } from 'react-router-dom'
import DepartmentForm from '../components/DepartmentForm'
import { useDepartments } from '../context/useDepartments'

// Full-page counterpart to DepartmentForm's modal variant (used for "Add
// department"). Mounted at /admin/departments/:id/edit.
export default function DepartmentEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { departments, isLoading } = useDepartments()
  const department = departments.find((d) => String(d.id) === id)

  if (isLoading) return null
  if (!department) return <Navigate to="/admin/departments" replace />

  return <DepartmentForm department={department} onClose={() => navigate(`/admin/departments/${department.id}`)} variant="page" />
}
