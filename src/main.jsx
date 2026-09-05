import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { DepartmentsProvider } from './context/DepartmentsContext.jsx'
import { EmployeesProvider } from './context/EmployeesContext.jsx'
import { JobDescriptionsProvider } from './context/JobDescriptionsContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DepartmentsProvider>
          <JobDescriptionsProvider>
            <EmployeesProvider>
              <App />
            </EmployeesProvider>
          </JobDescriptionsProvider>
        </DepartmentsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
