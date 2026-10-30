import { Link, Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import InquiryForm from './pages/InquiryForm.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

function NotFound() {
  return (
    <section className="card">
      <div className="state">
        <div className="state__icon" aria-hidden="true">?</div>
        <h1 className="state__title">Page not found</h1>
        <p>The page you are looking for doesn&apos;t exist or has been moved.</p>
        <Link to="/" className="btn btn--primary">
          Go to the inquiry form
        </Link>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main">
        <div className="container">
          <Routes>
            <Route path="/" element={<InquiryForm />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
      <footer className="footer">
        <div className="container">© {new Date().getFullYear()} EdTech CRM · Inquiry System</div>
      </footer>
    </div>
  );
}
