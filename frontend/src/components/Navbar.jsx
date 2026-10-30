import { Link, NavLink, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../api/client.js';

const linkClass = ({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`;

export default function Navbar() {
  // Subscribing to the location re-renders the navbar after login/logout navigations.
  useLocation();
  const loggedIn = isAuthenticated();

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="brand" aria-label="EdTech CRM home">
          <span className="brand__logo" aria-hidden="true">
            E
          </span>
          <span className="brand__text">
            EdTech<span className="brand__accent">CRM</span>
          </span>
        </Link>

        <nav className="nav" aria-label="Main">
          <NavLink to="/" end className={(state) => `${linkClass(state)} nav__link--optional`}>
            Inquiry Form
          </NavLink>
          {loggedIn ? (
            <NavLink to="/admin/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
          ) : (
            <Link to="/admin/login" className="btn btn--primary btn--sm">
              Admin Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
