import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import Icon from '../components/Icon'
import { useAuth } from '../context/useAuth'

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  if (isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname || '/'} replace />
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (login(username, password)) {
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } else {
      setError('Incorrect username or password.')
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <img src={logo} alt="Syncaxis" className="login-logo" />
        <h1>Sign in</h1>
        <p className="page-subtitle">Syncaxis Company Portal</p>

        <label className="form-field">
          <span>Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />
        </label>
        <label className="form-field">
          <span>Password</span>
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <Icon name={showPassword ? 'eye-off' : 'eye'} size={17} />
            </button>
          </div>
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn-primary login-submit">
          Sign in
        </button>
      </form>
    </div>
  )
}
