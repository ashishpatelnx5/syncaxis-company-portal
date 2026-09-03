import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import Admin from './pages/Admin'
import Home from './pages/Home'
import Applications from './pages/Applications'
import Departments from './pages/Departments'
import Directory from './pages/Directory'
import EmployeeDetail from './pages/EmployeeDetail'
import Hierarchy from './pages/Hierarchy'
import Login from './pages/Login'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="directory" element={<Directory />} />
          <Route path="employee/:id" element={<EmployeeDetail />} />
          <Route path="hierarchy" element={<Hierarchy />} />
          <Route path="applications" element={<Applications />} />
          <Route path="admin">
            <Route index element={<Navigate to="employees" replace />} />
            <Route path="employees" element={<Admin />} />
            <Route path="departments" element={<Departments />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

export default App
