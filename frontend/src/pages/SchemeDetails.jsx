import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { schemeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiExternalLink,
  FiFileText,
  FiLayers,
  FiMapPin,
  FiUsers,
  FiShield,
  FiList,
  FiSend,
} from 'react-icons/fi';
import './SchemeDetails.css';

const SchemeDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const eligibilityRef = useRef(null);

  const [scheme, setScheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Eligibility form state (prefilled from citizen profile if available)
  const [profile, setProfile] = useState({
    age: user?.age || '',
    gender: user?.gender || '',
    state: user?.state || 'Andhra Pradesh',
    occupation: user?.occupation || '',
    annualIncome: user?.annualIncome || '',
    category: user?.category || '',
    disability: user?.disability || false,
    farmer: user?.occupation?.toLowerCase() === 'farmer' || false,
    student: user?.occupation?.toLowerCase() === 'student' || false,
  });

  const [evaluating, setEvaluating] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [evalError, setEvalError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchScheme = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await schemeAPI.getById(id);
        if (isMounted) {
          setScheme(res.data.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              'Unable to load scheme details. Please try again.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchScheme();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Scroll to eligibility if hash is present
  useEffect(() => {
    if (location.hash === '#eligibility' && eligibilityRef.current) {
      setTimeout(() => {
        eligibilityRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    }
  }, [location.hash, scheme]);

  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCheckEligibility = async (e) => {
    e.preventDefault();
    setEvaluating(true);
    setEvalError('');
    setEligibilityResult(null);

    // Prepare payload (convert strings to proper types)
    const payload = {
      ...profile,
      age: profile.age !== '' ? Number(profile.age) : null,
      annualIncome: profile.annualIncome !== '' ? Number(profile.annualIncome) : null,
    };

    try {
      const res = await schemeAPI.checkEligibility(id, payload);
      setEligibilityResult(res.data.data);
    } catch (err) {
      setEvalError(
        err.response?.data?.message ||
          'Something went wrong while evaluating eligibility. Please try again.'
      );
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading scheme information...</p>
      </div>
    );
  }

  if (error || !scheme) {
    return (
      <div className="placeholder-page">
        <div className="auth-error-alert">{error || 'Scheme not found'}</div>
        <Link to="/schemes" className="btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
          <FiArrowLeft /> Back to Schemes
        </Link>
      </div>
    );
  }

  return (
    <div className="scheme-details-container">
      <Link to="/schemes" className="back-nav">
        <FiArrowLeft /> Back to Schemes Discovery
      </Link>

      {/* Hero Card */}
      <div className="scheme-hero-card">
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

        <h1 className="scheme-hero-title">{scheme.schemeName}</h1>
        <div className="scheme-hero-dept">{scheme.department}</div>

        <div className="scheme-meta-grid">
          <div className="meta-item">
            <span className="meta-label">Target Beneficiary</span>
            <span className="meta-value">{scheme.beneficiary || 'All Eligible Citizens'}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Jurisdiction / Scope</span>
            <span className="meta-value">{scheme.state === 'All' ? 'Central Government' : scheme.state}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Verified Source</span>
            <span className="meta-value">{scheme.source || 'Official Government Gazette'}</span>
          </div>
        </div>
      </div>

      <div className="details-sections-grid">
        {/* Description */}
        <div className="detail-section">
          <h2>
            <FiFileText /> Scheme Overview
          </h2>
          <p>{scheme.description}</p>
        </div>

        {/* Benefits */}
        {scheme.benefits && scheme.benefits.length > 0 && (
          <div className="detail-section">
            <h2>
              <FiShield /> Key Benefits & Entitlements
            </h2>
            <ul className="styled-list">
              {scheme.benefits.map((benefit, idx) => (
                <li key={idx}>
                  <span className="list-bullet">✔</span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Eligibility Text / Criteria Overview */}
        {scheme.eligibilityText && (
          <div className="detail-section">
            <h2>
              <FiUsers /> Eligibility Guidelines
            </h2>
            <p>{scheme.eligibilityText}</p>
          </div>
        )}

        {/* Documents Required */}
        {scheme.documents && scheme.documents.length > 0 && (
          <div className="detail-section">
            <h2>
              <FiList /> Required Documents Checklist
            </h2>
            <ul className="styled-list">
              {scheme.documents.map((doc, idx) => (
                <li key={idx}>
                  <span className="list-bullet">📄</span>
                  <span>{doc}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Application Process */}
        {scheme.applicationProcess && scheme.applicationProcess.length > 0 && (
          <div className="detail-section">
            <h2>
              <FiSend /> How to Apply (Step-by-Step)
            </h2>
            <ul className="styled-list">
              {scheme.applicationProcess.map((step, idx) => (
                <li key={idx}>
                  <span className="step-number">{idx + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Official Application Portal Link */}
        {scheme.officialWebsite && (
          <div className="portal-action-box">
            <div className="portal-text">
              <h3>Official Government Application Portal</h3>
              <p>Apply directly on the authenticated government website without intermediaries.</p>
            </div>
            <a
              href={scheme.officialWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-external"
            >
              <span>Visit Official Portal</span>
              <FiExternalLink />
            </a>
          </div>
        )}

        {/* Deterministic Eligibility Checker */}
        <div className="eligibility-checker-card" id="eligibility" ref={eligibilityRef}>
          <h2>
            <FiCheckCircle /> Deterministic Eligibility Checker
          </h2>
          <p className="eligibility-checker-desc">
            Evaluate your eligibility against the verified deterministic rules for {scheme.schemeName}.
          </p>

          <form onSubmit={handleCheckEligibility}>
            <div className="eligibility-form-grid">
              <div className="form-group">
                <label htmlFor="age">Age</label>
                <input
                  id="age"
                  name="age"
                  type="number"
                  placeholder="e.g. 35"
                  value={profile.age}
                  onChange={handleProfileChange}
                  min="0"
                  max="130"
                />
              </div>

              <div className="form-group">
                <label htmlFor="gender">Gender</label>
                <select
                  id="gender"
                  name="gender"
                  value={profile.gender}
                  onChange={handleProfileChange}
                >
                  <option value="">-- Select Gender --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Transgender">Transgender</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="state">State</label>
                <input
                  id="state"
                  name="state"
                  type="text"
                  placeholder="e.g. Andhra Pradesh"
                  value={profile.state}
                  onChange={handleProfileChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="annualIncome">Annual Income (₹)</label>
                <input
                  id="annualIncome"
                  name="annualIncome"
                  type="number"
                  placeholder="e.g. 150000"
                  value={profile.annualIncome}
                  onChange={handleProfileChange}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">Social Category</label>
                <select
                  id="category"
                  name="category"
                  value={profile.category}
                  onChange={handleProfileChange}
                >
                  <option value="">-- Select Category --</option>
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="EWS">EWS</option>
                  <option value="Minority">Minority</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="occupation">Occupation</label>
                <input
                  id="occupation"
                  name="occupation"
                  type="text"
                  placeholder="e.g. Farmer, Student, Artisan"
                  value={profile.occupation}
                  onChange={handleProfileChange}
                />
              </div>

              <div className="checkbox-group">
                <input
                  id="farmer"
                  name="farmer"
                  type="checkbox"
                  checked={profile.farmer}
                  onChange={handleProfileChange}
                />
                <label htmlFor="farmer">Farmer / Agriculturalist</label>
              </div>

              <div className="checkbox-group">
                <input
                  id="student"
                  name="student"
                  type="checkbox"
                  checked={profile.student}
                  onChange={handleProfileChange}
                />
                <label htmlFor="student">Student / Enrolled in Course</label>
              </div>

              <div className="checkbox-group">
                <input
                  id="disability"
                  name="disability"
                  type="checkbox"
                  checked={profile.disability}
                  onChange={handleProfileChange}
                />
                <label htmlFor="disability">Person with Disability (PwD)</label>
              </div>
            </div>

            <button type="submit" className="auth-btn" disabled={evaluating} style={{ maxWidth: '280px' }}>
              {evaluating ? (
                <>
                  <span className="btn-spinner"></span>
                  <span>Evaluating Rules...</span>
                </>
              ) : (
                'Check My Eligibility'
              )}
            </button>
          </form>

          {evalError && <div className="auth-error-alert" style={{ marginTop: '1rem' }}>{evalError}</div>}

          {/* Result Presentation */}
          {eligibilityResult && (
            <div
              className={`eligibility-result ${
                eligibilityResult.status === 'eligible'
                  ? 'result-eligible'
                  : eligibilityResult.status === 'ineligible'
                  ? 'result-ineligible'
                  : 'result-missing'
              }`}
            >
              <div className="result-header">
                {eligibilityResult.status === 'eligible' && (
                  <>
                    <FiCheckCircle />
                    <span>Eligible for {scheme.schemeName}</span>
                  </>
                )}
                {eligibilityResult.status === 'ineligible' && (
                  <>
                    <FiXCircle />
                    <span>Not Currently Eligible</span>
                  </>
                )}
                {eligibilityResult.status === 'missing_information' && (
                  <>
                    <FiAlertCircle />
                    <span>Additional Information Required</span>
                  </>
                )}
              </div>

              {eligibilityResult.status === 'eligible' && (
                <p>
                  Based on the deterministic rules evaluated by the JanSahayak engine, you satisfy the criteria for this scheme.
                  Please visit the official portal to apply: <a href={scheme.officialWebsite} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', fontWeight: 'bold' }}>{scheme.officialWebsite}</a>
                </p>
              )}

              {eligibilityResult.status === 'ineligible' && eligibilityResult.reasons && (
                <div>
                  <p>The following rule criteria were not met:</p>
                  <ul className="result-reasons">
                    {eligibilityResult.reasons.map((r, i) => (
                      <li key={i}>{typeof r === 'string' ? r : r.message || JSON.stringify(r)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {eligibilityResult.status === 'missing_information' && eligibilityResult.missingInformation && (
                <div>
                  <p>Please specify the following details to complete the deterministic evaluation:</p>
                  <ul className="result-reasons">
                    {eligibilityResult.missingInformation.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchemeDetails;
