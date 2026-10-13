import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import {
  FiPlus,
  FiSearch,
  FiEdit,
  FiCheckCircle,
  FiXCircle,
  FiPower,
} from 'react-icons/fi';
import './Admin.css';

const CATEGORIES = [
  'All',
  'Agriculture',
  'Healthcare',
  'Housing',
  'Social Welfare',
  'Financial Inclusion',
  'Women Empowerment',
  'Education',
  'Entrepreneurship',
];

const STATES = [
  'All',
  'Central',
  'Andhra Pradesh',
  'Telangana',
];

const AdminSchemes = () => {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedState, setSelectedState] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchSchemes = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedState !== 'All') params.state = selectedState;
      if (statusFilter === 'active') params.isActive = true;
      if (statusFilter === 'inactive') params.isActive = false;

      const res = await adminAPI.getSchemes(params);
      setSchemes(res.data.data || []);
    } catch (err) {
      setError('Unable to load schemes. Please check administrative connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSchemes();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, selectedState, statusFilter]);

  const handleToggleStatus = async (scheme) => {
    const newStatus = !scheme.isActive;
    setActionLoadingId(scheme._id);
    setSuccessMsg('');
    setError('');

    try {
      const res = await adminAPI.toggleSchemeStatus(scheme._id, newStatus);
      setSchemes((prev) =>
        prev.map((s) => (s._id === scheme._id ? { ...s, isActive: newStatus } : s))
      );
      setSuccessMsg(res.data.message || `Scheme ${newStatus ? 'activated' : 'deactivated'} successfully`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update scheme status');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Government Scheme Management</h1>
          <p>Create, update, activate, and deactivate verified welfare schemes and deterministic rules</p>
        </div>
        <div>
          <Link to="/admin/schemes/new" className="btn-primary">
            <FiPlus /> Add New Scheme
          </Link>
        </div>
      </div>

      {successMsg && <div className="placeholder-badge" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>{successMsg}</div>}
      {error && <div className="auth-error-alert">{error}</div>}

      <div className="admin-section">
        {/* Filters Bar */}
        <div className="schemes-filters" style={{ marginBottom: '1.25rem' }}>
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search scheme name, department, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                Category: {cat}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
          >
            {STATES.map((st) => (
              <option key={st} value={st}>
                State: {st}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Status: All</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {/* Schemes Table */}
        {loading ? (
          <div className="loading-screen" style={{ minHeight: '150px' }}>
            <div className="spinner"></div>
            <p>Fetching scheme records...</p>
          </div>
        ) : schemes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No schemes found matching the filters</h3>
            <p>Try resetting the search or filter parameters.</p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('All');
                setSelectedState('All');
                setStatusFilter('all');
              }}
              className="btn-secondary"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Scheme Name</th>
                  <th>Category</th>
                  <th>State</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Official Website</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schemes.map((scheme) => (
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
                      {scheme.officialWebsite ? (
                        <a
                          href={scheme.officialWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#0284c7', fontSize: '0.85rem' }}
                        >
                          View Link
                        </a>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>None</span>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link
                          to={`/admin/schemes/${scheme._id}/edit`}
                          className="btn-action-edit"
                          title="Edit scheme and rules"
                        >
                          <FiEdit size={12} /> Edit
                        </Link>
                        <button
                          onClick={() => handleToggleStatus(scheme)}
                          disabled={actionLoadingId === scheme._id}
                          className={`btn-action-status ${
                            scheme.isActive
                              ? 'btn-action-deactivate'
                              : 'btn-action-activate'
                          }`}
                          title={scheme.isActive ? 'Deactivate scheme' : 'Activate scheme'}
                        >
                          <FiPower size={12} />
                          {scheme.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
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

export default AdminSchemes;
