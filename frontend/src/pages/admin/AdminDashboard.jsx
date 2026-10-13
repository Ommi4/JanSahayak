import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import {
  FiGrid,
  FiFileText,
  FiCheckCircle,
  FiXCircle,
  FiUsers,
  FiMessageSquare,
  FiPlus,
  FiArrowRight,
  FiSliders,
} from 'react-icons/fi';
import './Admin.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentSchemes, setRecentSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardData = async () => {
      setLoading(true);
      setError('');
      try {
        const [statsRes, schemesRes] = await Promise.all([
          adminAPI.getDashboard(),
          adminAPI.getSchemes(),
        ]);

        if (isMounted) {
          setStats(statsRes.data.data);
          setRecentSchemes((schemesRes.data.data || []).slice(0, 5));
        }
      } catch (err) {
        if (isMounted) {
          setError('Unable to load administrator metrics. Please check server connection.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="admin-container">
      {/* Admin Header */}
      <div className="admin-header">
        <div>
          <h1>Administrator Control Center</h1>
          <p>Government Scheme Dataset & Citizen Platform Administration</p>
        </div>
        <div className="admin-actions-bar">
          <Link to="/admin/schemes/new" className="btn-primary">
            <FiPlus /> Add New Scheme
          </Link>
          <Link to="/admin/schemes" className="btn-secondary">
            <FiSliders /> Manage Schemes
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading administrative telemetry...</p>
        </div>
      ) : error ? (
        <div className="auth-error-alert">{error}</div>
      ) : (
        <>
          {/* Metrics Overview Grid */}
          <div className="admin-stats-grid">
            <div className="stat-card">
              <div className="stat-icon stat-icon-blue">
                <FiFileText />
              </div>
              <div className="stat-info">
                <span className="stat-count">{stats?.totalSchemes ?? 0}</span>
                <span className="stat-label">Total Schemes</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-green">
                <FiCheckCircle />
              </div>
              <div className="stat-info">
                <span className="stat-count">{stats?.activeSchemes ?? 0}</span>
                <span className="stat-label">Active Schemes</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-amber">
                <FiXCircle />
              </div>
              <div className="stat-info">
                <span className="stat-count">{stats?.inactiveSchemes ?? 0}</span>
                <span className="stat-label">Inactive Schemes</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-purple">
                <FiUsers />
              </div>
              <div className="stat-info">
                <span className="stat-count">{stats?.totalCitizens ?? stats?.totalUsers ?? 0}</span>
                <span className="stat-label">Registered Citizens</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-teal">
                <FiMessageSquare />
              </div>
              <div className="stat-info">
                <span className="stat-count">{stats?.totalConversations ?? 0}</span>
                <span className="stat-label">Conversations</span>
              </div>
            </div>
          </div>

          {/* Recent Schemes Overview */}
          <div className="admin-section">
            <div className="admin-section-header">
              <h2>
                <FiGrid /> Government Scheme Dataset Overview
              </h2>
              <Link to="/admin/schemes" className="section-action-link">
                <span>View all {stats?.totalSchemes ?? ''} schemes</span>
                <FiArrowRight style={{ marginLeft: '4px' }} />
              </Link>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Scheme Name</th>
                    <th>Category</th>
                    <th>State</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSchemes.map((scheme) => (
                    <tr key={scheme._id}>
                      <td>
                        <strong>{scheme.schemeName}</strong>
                      </td>
                      <td>{scheme.category}</td>
                      <td>{scheme.state || 'All India'}</td>
                      <td>{scheme.department}</td>
                      <td>
                        {scheme.isActive ? (
                          <span className="badge-status-active">
                            <FiCheckCircle size={12} /> Active
                          </span>
                        ) : (
                          <span className="badge-status-inactive">
                            <FiXCircle size={12} /> Inactive
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          <Link to={`/admin/schemes/${scheme._id}/edit`} className="btn-action-edit">
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
