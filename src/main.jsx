import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { DepartmentsProvider } from './context/DepartmentsContext.jsx'
import { EmployeesProvider } from './context/EmployeesContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <DepartmentsProvider>
        <EmployeesProvider>
          <App />
        </EmployeesProvider>
      </DepartmentsProvider>
    </BrowserRouter>
  </StrictMode>,
)
