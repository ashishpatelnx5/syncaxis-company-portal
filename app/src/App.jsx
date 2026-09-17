import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedPage from './components/ProtectedPage'
import RequireAuth from './components/RequireAuth'
import Account from './pages/Account'
import Admin from './pages/Admin'
import Home from './pages/Home'
import Applications from './pages/Applications'
import Complaints from './pages/Complaints'
import ComplaintsAdmin from './pages/ComplaintsAdmin'
import DailyPlan from './pages/DailyPlan'
import DepartmentDetail from './pages/DepartmentDetail'
import DepartmentEdit from './pages/DepartmentEdit'
import Departments from './pages/Departments'
import Directory from './pages/Directory'
import EmployeeDetail from './pages/EmployeeDetail'
import EmployeeEdit from './pages/EmployeeEdit'
import Hierarchy from './pages/Hierarchy'
import Holidays from './pages/Holidays'
import HolidaysAdmin from './pages/HolidaysAdmin'
import JobDescriptionDetail from './pages/JobDescriptionDetail'
import JobDescriptionEdit from './pages/JobDescriptionEdit'
import JobDescriptions from './pages/JobDescriptions'
import JobDescriptionsAdmin from './pages/JobDescriptionsAdmin'
import Login from './pages/Login'
import MyProfile from './pages/MyProfile'
import Organisation from './pages/Organisation'
import OrganisationOverview from './pages/OrganisationOverview'
import TeamDailyPlans from './pages/TeamDailyPlans'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="account" element={<Account />} />
          <Route path="my-profile" element={<MyProfile />} />
          <Route
            path="employee/:id"
            element={
              <ProtectedPage pageKey="directory">
                <EmployeeDetail />
              </ProtectedPage>
            }
          />
          <Route path="organisation" element={<Organisation />}>
            <Route
              index
              element={
                <ProtectedPage pageKeys={['directory', 'hierarchy', 'holidays']}>
                  <OrganisationOverview />
                </ProtectedPage>
              }
            />
            <Route
              path="directory"
              element={
                <ProtectedPage pageKey="directory">
                  <Directory />
                </ProtectedPage>
              }
            />
            <Route
              path="hierarchy"
              element={
                <ProtectedPage pageKey="hierarchy">
                  <Hierarchy />
                </ProtectedPage>
              }
            />
            <Route
              path="holidays"
              element={
                <ProtectedPage pageKey="holidays">
                  <Holidays />
                </ProtectedPage>
              }
            />
          </Route>
          <Route
            path="applications"
            element={
              <ProtectedPage pageKey="applications">
                <Applications />
              </ProtectedPage>
            }
          />
          <Route
            path="job-descriptions"
            element={
              <ProtectedPage pageKey="job-descriptions">
                <JobDescriptions />
              </ProtectedPage>
            }
          />
          <Route
            path="job-descriptions/:id"
            element={
              <ProtectedPage pageKey="job-descriptions">
                <JobDescriptionDetail />
              </ProtectedPage>
            }
          />
          <Route
            path="daily-plan"
            element={
              <ProtectedPage pageKey="daily-plan">
                <DailyPlan />
              </ProtectedPage>
            }
          />
          <Route
            path="complaints"
            element={
              <ProtectedPage pageKeys={['complaints', 'admin-complaints']}>
                <Complaints />
              </ProtectedPage>
            }
          />
          <Route path="admin">
            <Route index element={<Navigate to="employees" replace />} />
            <Route
              path="employees"
              element={
                <ProtectedPage pageKey="admin-employees">
                  <Admin />
                </ProtectedPage>
              }
            />
            <Route
              path="employees/:id"
              element={
                <ProtectedPage pageKey="admin-employees">
                  <EmployeeDetail adminContext />
                </ProtectedPage>
              }
            />
            <Route
              path="employees/:id/edit"
              element={
                <ProtectedPage pageKey="admin-employees">
                  <EmployeeEdit />
                </ProtectedPage>
              }
            />
            <Route
              path="departments"
              element={
                <ProtectedPage pageKey="admin-departments">
                  <Departments />
                </ProtectedPage>
              }
            />
            <Route
              path="departments/:id"
              element={
                <ProtectedPage pageKey="admin-departments">
                  <DepartmentDetail />
                </ProtectedPage>
              }
            />
            <Route
              path="departments/:id/edit"
              element={
                <ProtectedPage pageKey="admin-departments">
                  <DepartmentEdit />
                </ProtectedPage>
              }
            />
            <Route
              path="job-descriptions"
              element={
                <ProtectedPage pageKey="admin-job-descriptions">
                  <JobDescriptionsAdmin />
                </ProtectedPage>
              }
            />
            <Route
              path="job-descriptions/:id"
              element={
                <ProtectedPage pageKey="admin-job-descriptions">
                  <JobDescriptionDetail adminContext />
                </ProtectedPage>
              }
            />
            <Route
              path="job-descriptions/:id/edit"
              element={
                <ProtectedPage pageKey="admin-job-descriptions">
                  <JobDescriptionEdit />
                </ProtectedPage>
              }
            />
            <Route
              path="daily-plans"
              element={
                <ProtectedPage pageKey="admin-daily-plans">
                  <TeamDailyPlans />
                </ProtectedPage>
              }
            />
            <Route
              path="holidays"
              element={
                <ProtectedPage pageKey="admin-holidays">
                  <HolidaysAdmin />
                </ProtectedPage>
              }
            />
            <Route
              path="complaints"
              element={
                <ProtectedPage pageKey="admin-complaints">
                  <ComplaintsAdmin />
                </ProtectedPage>
              }
            />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

export default App
