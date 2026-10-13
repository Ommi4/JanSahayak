import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { schemeAPI } from '../services/api';
import { FiSearch, FiCheckSquare, FiInfo, FiLayers, FiMapPin } from 'react-icons/fi';
import './Schemes.css';

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

const Schemes = () => {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedState, setSelectedState] = useState('All');

  useEffect(() => {
    let isMounted = true;
    const fetchSchemes = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (search.trim()) params.search = search.trim();
        if (selectedCategory !== 'All') params.category = selectedCategory;
        if (selectedState !== 'All') params.state = selectedState;

        const res = await schemeAPI.getAll(params);
        if (isMounted) {
          setSchemes(res.data.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError('Unable to load schemes. Please check your connection and try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Debounce search input
    const debounceTimer = setTimeout(() => {
      fetchSchemes();
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [search, selectedCategory, selectedState]);

  return (
    <div className="schemes-page">
      {/* Header & Filter Controls */}
      <div className="schemes-header">
        <h1>Discover Government Schemes</h1>
        <p>
          Explore authentic Indian central and state welfare initiatives with verified eligibility criteria.
        </p>

        <div className="schemes-filters">
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by scheme name, benefit, or keyword..."
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
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Fetching government schemes...</p>
        </div>
      ) : error ? (
        <div className="placeholder-page">
          <div className="auth-error-alert" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
          <button
            onClick={() => setSearch('')}
            className="btn-primary"
            style={{ margin: '0 auto' }}
          >
            Reset Filters
          </button>
        </div>
      ) : schemes.length === 0 ? (
        <div className="placeholder-page">
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>No schemes match your criteria</h3>
            <p>Try adjusting your search keywords or clearing the category and state filters.</p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('All');
                setSelectedState('All');
              }}
              className="btn-primary"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="schemes-count">
            Showing {schemes.length} verified government {schemes.length === 1 ? 'scheme' : 'schemes'}
          </div>

          <div className="schemes-grid">
            {schemes.map((scheme) => (
              <div key={scheme._id} className="scheme-card">
                <div className="scheme-card-badges">
                  <span className="badge badge-category">
                    <FiLayers style={{ marginRight: '3px' }} />
                    {scheme.category}
                  </span>
                  <span className="badge badge-state">
                    <FiMapPin style={{ marginRight: '3px' }} />
                    {scheme.state || 'All India'}
                  </span>
                </div>

                <h3 className="scheme-card-title">{scheme.schemeName}</h3>
                <div className="scheme-card-dept">{scheme.department}</div>

                <p className="scheme-card-desc">{scheme.description}</p>

                {scheme.benefits && scheme.benefits.length > 0 && (
                  <div className="scheme-benefits-preview">
                    <strong>Key Benefit:</strong>
                    <span>{scheme.benefits[0]}</span>
                  </div>
                )}

                <div className="scheme-card-actions">
                  <Link to={`/schemes/${scheme._id}`} className="btn-details">
                    <FiInfo /> Details
                  </Link>
                  <Link
                    to={`/schemes/${scheme._id}#eligibility`}
                    className="btn-check"
                  >
                    <FiCheckSquare /> Check Eligibility
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Schemes;
