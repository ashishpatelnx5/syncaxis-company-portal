import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { DepartmentsProvider } from './context/DepartmentsContext.jsx'
import { EmployeesProvider } from './context/EmployeesContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DepartmentsProvider>
          <EmployeesProvider>
            <App />
          </EmployeesProvider>
        </DepartmentsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
