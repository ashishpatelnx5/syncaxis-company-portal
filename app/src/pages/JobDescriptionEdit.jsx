import { Navigate, useNavigate, useParams } from 'react-router-dom'
import JobDescriptionForm from '../components/JobDescriptionForm'
import { useJobDescriptions } from '../context/useJobDescriptions'

// Full-page counterpart to JobDescriptionForm's modal variant (used for
// "Add job description"). Mounted at /admin/job-descriptions/:id/edit.
export default function JobDescriptionEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { jobDescriptions, isLoading } = useJobDescriptions()
  const jobDescription = jobDescriptions.find((jd) => String(jd.id) === id)

  if (isLoading) return null
  if (!jobDescription) return <Navigate to="/admin/job-descriptions" replace />

  return (
    <JobDescriptionForm
      jobDescription={jobDescription}
      onClose={() => navigate(`/admin/job-descriptions/${jobDescription.id}`)}
      variant="page"
    />
  )
}
