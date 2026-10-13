import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import {
  FiUsers,
  FiSearch,
  FiShield,
  FiUserCheck,
} from 'react-icons/fi';
import './Admin.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (search.trim()) params.search = search.trim();

        const res = await adminAPI.getUsers(params);
        if (isMounted) {
          setUsers(res.data.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError('Unable to load citizen registry. Please check administrative connection.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [search]);

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Citizen & User Registry</h1>
          <p>Read-only overview of registered citizens on JanSahayak</p>
        </div>
      </div>

      {error && <div className="auth-error-alert">{error}</div>}

      <div className="admin-section">
        <div className="schemes-filters" style={{ marginBottom: '1.25rem' }}>
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by citizen name or email address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-screen" style={{ minHeight: '150px' }}>
            <div className="spinner"></div>
            <p>Loading citizen accounts...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No users found</h3>
            <p>No registered accounts match the search term.</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Citizen Name</th>
                  <th>Email Address</th>
                  <th>Preferred Language</th>
                  <th>Role</th>
                  <th>State / Location</th>
                  <th>Registered Date</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {u.role === 'admin' ? (
                          <FiShield style={{ color: '#3b82f6' }} />
                        ) : (
                          <FiUserCheck style={{ color: '#10b981' }} />
                        )}
                        <strong>{u.name}</strong>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className="badge" style={{ background: '#f1f5f9', color: '#334155' }}>
                        {u.preferredLanguage || 'English'}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: u.role === 'admin' ? '#dbeafe' : '#f0fdf4',
                          color: u.role === 'admin' ? '#1e40af' : '#166534',
                          fontWeight: 700,
                        }}
                      >
                        {u.role?.toUpperCase() || 'CITIZEN'}
                      </span>
                    </td>
                    <td>{u.state || 'Not specified'}</td>
                    <td>
                      {new Date(u.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
