import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Admin from './pages/Admin'
import Home from './pages/Home'
import Applications from './pages/Applications'
import Directory from './pages/Directory'
import EmployeeDetail from './pages/EmployeeDetail'
import Hierarchy from './pages/Hierarchy'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="directory" element={<Directory />} />
        <Route path="employee/:id" element={<EmployeeDetail />} />
        <Route path="hierarchy" element={<Hierarchy />} />
        <Route path="applications" element={<Applications />} />
        <Route path="admin" element={<Admin />} />
      </Route>
    </Routes>
  )
}

export default App
