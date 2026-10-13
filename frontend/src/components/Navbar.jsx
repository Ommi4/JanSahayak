import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiLogOut,
  FiMessageSquare,
  FiGrid,
  FiFileText,
  FiUsers,
  FiSliders,
  FiShield,
} from 'react-icons/fi';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <nav className={`navbar ${isAdmin ? 'navbar-admin' : ''}`}>
      <div className="navbar-container">
        <Link to={isAdmin ? '/admin/dashboard' : '/dashboard'} className="navbar-brand">
          <span className="brand-icon">{isAdmin ? '🛡️' : '🏛️'}</span>
          <span className="brand-text">JanSahayak</span>
          {isAdmin && <span className="brand-admin-tag">ADMIN</span>}
        </Link>

        <div className="navbar-links">
          {isAuthenticated ? (
            isAdmin ? (
              // Administrator Navigation
              <>
                <Link to="/admin/dashboard" className="nav-link" title="Admin Dashboard">
                  <FiGrid /> <span>Dashboard</span>
                </Link>
                <Link to="/admin/schemes" className="nav-link" title="Manage Schemes">
                  <FiSliders /> <span>Schemes</span>
                </Link>
                <Link to="/admin/users" className="nav-link" title="Registered Citizens">
                  <FiUsers /> <span>Citizens</span>
                </Link>
                <div className="nav-user">
                  <span className="nav-admin-badge">
                    <FiShield style={{ marginRight: '3px' }} />
                    {user?.name || 'Admin'}
                  </span>
                  <button className="nav-logout-btn" onClick={handleLogout} title="Logout">
                    <FiLogOut />
                  </button>
                </div>
              </>
            ) : (
              // Citizen Navigation
              <>
                <Link to="/dashboard" className="nav-link" title="Dashboard">
                  <FiGrid /> <span>Dashboard</span>
                </Link>
                <Link to="/schemes" className="nav-link" title="Schemes">
                  <FiFileText /> <span>Schemes</span>
                </Link>
                <Link to="/chat" className="nav-link" title="Chat">
                  <FiMessageSquare /> <span>Chat</span>
                </Link>
                <div className="nav-user">
                  <span className="nav-user-name">{user?.name}</span>
                  <button className="nav-logout-btn" onClick={handleLogout} title="Logout">
                    <FiLogOut />
                  </button>
                </div>
              </>
            )
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link nav-register-btn">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
