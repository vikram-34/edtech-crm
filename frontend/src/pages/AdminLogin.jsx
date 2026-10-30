import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api, isAuthenticated, saveSession } from '../api/client.js';
import { EMAIL_RE } from '../constants.js';

const DASHBOARD_PATH = '/admin/dashboard';

function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated()) {
    return <Navigate to={DASHBOARD_PATH} replace />;
  }

  const sessionExpired = searchParams.get('expired') === '1';
  const redirectTo = location.state?.from?.pathname || DASHBOARD_PATH;

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const nextErrors = {};
    if (!trimmedEmail) nextErrors.email = 'Email is required';
    else if (!EMAIL_RE.test(trimmedEmail)) nextErrors.email = 'Please enter a valid email address';
    if (!password) nextErrors.password = 'Password is required';

    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      const { token, admin } = await api.login(trimmedEmail, password);
      saveSession(token, admin);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setErrors(err.errors || {});
      setFormError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="card auth-card" aria-labelledby="login-title">
        <div className="card__body">
          <div className="auth-card__header">
            <div className="auth-card__icon">
              <LockIcon />
            </div>
            <h1 id="login-title" className="card__title">
              Admin Login
            </h1>
            <p className="card__subtitle">Sign in to view and manage inquiries.</p>
          </div>

          {sessionExpired && !formError && (
            <div className="alert alert--info" role="status">
              <span className="alert__text">Your session has expired or is no longer valid. Please log in again.</span>
            </div>
          )}
          {formError && (
            <div className="alert alert--error" role="alert">
              <span className="alert__icon" aria-hidden="true">
                !
              </span>
              <span className="alert__text">{formError}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className={`field${errors.email ? ' field--invalid' : ''}`}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className="input"
                inputMode="email"
                autoComplete="username"
                placeholder="admin@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={submitting}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? 'email-error' : undefined}
                autoFocus
              />
              {errors.email && (
                <p id="email-error" className="field__error">
                  {errors.email}
                </p>
              )}
            </div>

            <div className={`field${errors.password ? ' field--invalid' : ''}`}>
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={submitting}
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="field__error">
                  {errors.password}
                </p>
              )}
            </div>

            <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="auth-card__footnote">
            Not an admin? <Link to="/">Submit an inquiry instead</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
