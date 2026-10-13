import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import {
  FiArrowLeft,
  FiSave,
  FiCheckCircle,
  FiInfo,
  FiShield,
  FiList,
  FiSend,
  FiGlobe,
} from 'react-icons/fi';
import './Admin.css';

const CATEGORY_OPTIONS = [
  'Agriculture',
  'Healthcare',
  'Housing',
  'Social Welfare',
  'Financial Inclusion',
  'Women Empowerment',
  'Education',
  'Entrepreneurship',
];

const AdminSchemeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    schemeName: '',
    category: 'Agriculture',
    department: 'Government of India',
    state: 'All',
    beneficiary: 'Eligible Citizens',
    description: '',
    benefits: '',
    eligibilityText: '',
    documents: '',
    applicationProcess: '',
    officialWebsite: '',
    source: 'Official Government Portal Notification',
    isActive: true,
    // Structured Rules
    minAge: '',
    maxAge: '',
    minAnnualIncome: '',
    maxAnnualIncome: '',
    gender: 'all',
    categoryRule: 'all',
    occupationRule: '',
    farmer: false,
    student: false,
    disability: false,
  });

  useEffect(() => {
    if (!isEditing) return;

    let isMounted = true;
    const fetchScheme = async () => {
      setLoading(true);
      try {
        const res = await adminAPI.getSchemeById(id);
        const scheme = res.data.data;

        if (isMounted) {
          const rules = scheme.rules || {};
          setFormData({
            schemeName: scheme.schemeName || '',
            category: scheme.category || 'Agriculture',
            department: scheme.department || '',
            state: scheme.state || 'All',
            beneficiary: scheme.beneficiary || '',
            description: scheme.description || '',
            benefits: (scheme.benefits || []).join('\n'),
            eligibilityText: scheme.eligibilityText || '',
            documents: (scheme.documents || []).join('\n'),
            applicationProcess: (scheme.applicationProcess || []).join('\n'),
            officialWebsite: scheme.officialWebsite || '',
            source: scheme.source || '',
            isActive: scheme.isActive !== undefined ? scheme.isActive : true,
            // Rules
            minAge: rules.age?.min ?? rules.minAge ?? '',
            maxAge: rules.age?.max ?? rules.maxAge ?? '',
            minAnnualIncome: rules.annualIncome?.min ?? rules.minAnnualIncome ?? '',
            maxAnnualIncome: rules.annualIncome?.max ?? rules.maxAnnualIncome ?? '',
            gender: Array.isArray(rules.gender) ? rules.gender[0] || 'all' : rules.gender || 'all',
            categoryRule: Array.isArray(rules.categories) ? rules.categories.join(', ') : rules.category || 'all',
            occupationRule: Array.isArray(rules.occupations) ? rules.occupations.join(', ') : rules.occupation || '',
            farmer: Boolean(rules.farmer),
            student: Boolean(rules.student),
            disability: Boolean(rules.disability),
          });
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load scheme details for editing');
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
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic frontend checks
    if (!formData.schemeName.trim()) {
      setError('Scheme name is required');
      return;
    }
    if (!formData.category.trim()) {
      setError('Category is required');
      return;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    if (formData.officialWebsite.trim()) {
      try {
        const url = new URL(formData.officialWebsite.trim());
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          throw new Error();
        }
      } catch (_) {
        setError('Official portal URL must be a valid HTTP or HTTPS address (e.g. https://pmkisan.gov.in)');
        return;
      }
    }

    // Build structured rules object matching deterministic engine expectations
    const rules = {};
    if (formData.minAge !== '' || formData.maxAge !== '') {
      rules.age = {};
      if (formData.minAge !== '') rules.age.min = Number(formData.minAge);
      if (formData.maxAge !== '') rules.age.max = Number(formData.maxAge);
    }

    if (formData.minAnnualIncome !== '' || formData.maxAnnualIncome !== '') {
      rules.annualIncome = {};
      if (formData.minAnnualIncome !== '') rules.annualIncome.min = Number(formData.minAnnualIncome);
      if (formData.maxAnnualIncome !== '') rules.annualIncome.max = Number(formData.maxAnnualIncome);
    }

    if (formData.gender && formData.gender !== 'all') {
      rules.gender = [formData.gender.toLowerCase().trim()];
    }

    if (formData.categoryRule && formData.categoryRule !== 'all') {
      rules.categories = formData.categoryRule.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
    }

    if (formData.occupationRule.trim()) {
      rules.occupations = formData.occupationRule.split(',').map((o) => o.trim().toLowerCase()).filter(Boolean);
    }

    if (formData.farmer) rules.farmer = true;
    if (formData.student) rules.student = true;
    if (formData.disability) rules.disability = true;

    const payload = {
      schemeName: formData.schemeName.trim(),
      category: formData.category.trim(),
      department: formData.department.trim(),
      state: formData.state.trim(),
      beneficiary: formData.beneficiary.trim(),
      description: formData.description.trim(),
      benefits: formData.benefits,
      eligibilityText: formData.eligibilityText.trim(),
      rules,
      documents: formData.documents,
      applicationProcess: formData.applicationProcess,
      officialWebsite: formData.officialWebsite.trim(),
      source: formData.source.trim(),
      isActive: formData.isActive,
    };

    setSubmitting(true);
    try {
      if (isEditing) {
        await adminAPI.updateScheme(id, payload);
      } else {
        await adminAPI.createScheme(payload);
      }
      navigate('/admin/schemes');
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to save scheme. Please check the inputs and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading scheme configuration...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <Link to="/admin/schemes" className="back-nav">
        <FiArrowLeft /> Back to Scheme Management
      </Link>

      <div className="admin-header">
        <div>
          <h1>{isEditing ? `Edit Scheme: ${formData.schemeName}` : 'Add New Government Scheme'}</h1>
          <p>Configure scheme metadata, benefits, documents, and deterministic eligibility rules</p>
        </div>
      </div>

      {error && <div className="auth-error-alert">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* 1. Basic Information */}
        <div className="form-card-section">
          <h3>
            <FiInfo /> 1. Basic Information
          </h3>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="schemeName">Scheme Name *</label>
              <input
                id="schemeName"
                name="schemeName"
                type="text"
                placeholder="e.g. Pradhan Mantri Kisan Samman Nidhi"
                value={formData.schemeName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid-3" style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label htmlFor="department">Department / Ministry</label>
              <input
                id="department"
                name="department"
                type="text"
                placeholder="e.g. Ministry of Agriculture & Farmers Welfare"
                value={formData.department}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="state">State / Jurisdiction</label>
              <input
                id="state"
                name="state"
                type="text"
                placeholder="All (for Central) or specific State name"
                value={formData.state}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="beneficiary">Target Beneficiary</label>
              <input
                id="beneficiary"
                name="beneficiary"
                type="text"
                placeholder="e.g. Small & Marginal Farmers"
                value={formData.beneficiary}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label htmlFor="description">Scheme Description *</label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Comprehensive summary of the scheme purpose, coverage, and objectives..."
              value={formData.description}
              onChange={handleChange}
              className="chat-textarea"
              style={{ minHeight: '80px' }}
              required
            />
          </div>
        </div>

        {/* 2. Key Benefits */}
        <div className="form-card-section">
          <h3>
            <FiShield /> 2. Key Benefits & Entitlements
          </h3>
          <div className="form-group">
            <label htmlFor="benefits">Benefits (Enter each benefit on a new line)</label>
            <textarea
              id="benefits"
              name="benefits"
              rows={3}
              placeholder="e.g.&#10;Direct income support of ₹6,000 per year&#10;Paid in three equal installments of ₹2,000 directly to bank accounts"
              value={formData.benefits}
              onChange={handleChange}
              className="chat-textarea"
              style={{ minHeight: '80px' }}
            />
          </div>
        </div>

        {/* 3. Deterministic Eligibility Rules */}
        <div className="form-card-section">
          <h3>
            <FiCheckCircle /> 3. Deterministic Eligibility Rules
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
            These criteria are strictly enforced by the JanSahayak rule engine without AI hallucination.
          </p>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="minAge">Minimum Age (Years)</label>
              <input
                id="minAge"
                name="minAge"
                type="number"
                placeholder="e.g. 18 (leave blank if none)"
                value={formData.minAge}
                onChange={handleChange}
                min="0"
                max="130"
              />
            </div>

            <div className="form-group">
              <label htmlFor="maxAge">Maximum Age (Years)</label>
              <input
                id="maxAge"
                name="maxAge"
                type="number"
                placeholder="e.g. 60 (leave blank if none)"
                value={formData.maxAge}
                onChange={handleChange}
                min="0"
                max="130"
              />
            </div>
          </div>

          <div className="form-grid-2" style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label htmlFor="minAnnualIncome">Minimum Annual Income (₹)</label>
              <input
                id="minAnnualIncome"
                name="minAnnualIncome"
                type="number"
                placeholder="e.g. 0 (leave blank if none)"
                value={formData.minAnnualIncome}
                onChange={handleChange}
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="maxAnnualIncome">Maximum Annual Income (₹)</label>
              <input
                id="maxAnnualIncome"
                name="maxAnnualIncome"
                type="number"
                placeholder="e.g. 250000 (leave blank if none)"
                value={formData.maxAnnualIncome}
                onChange={handleChange}
                min="0"
              />
            </div>
          </div>

          <div className="form-grid-3" style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label htmlFor="gender">Gender Restriction</label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="all">All Genders</option>
                <option value="female">Female Only</option>
                <option value="male">Male Only</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="categoryRule">Social Categories (comma-separated or 'all')</label>
              <input
                id="categoryRule"
                name="categoryRule"
                type="text"
                placeholder="e.g. all OR SC, ST, OBC"
                value={formData.categoryRule}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="occupationRule">Allowed Occupations (comma-separated)</label>
              <input
                id="occupationRule"
                name="occupationRule"
                type="text"
                placeholder="e.g. Farmer, Artisan (or leave blank)"
                value={formData.occupationRule}
                onChange={handleChange}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '1rem' }}>
            <div className="checkbox-group" style={{ paddingTop: 0 }}>
              <input
                id="farmer"
                name="farmer"
                type="checkbox"
                checked={formData.farmer}
                onChange={handleChange}
              />
              <label htmlFor="farmer">Farmer Required</label>
            </div>

            <div className="checkbox-group" style={{ paddingTop: 0 }}>
              <input
                id="student"
                name="student"
                type="checkbox"
                checked={formData.student}
                onChange={handleChange}
              />
              <label htmlFor="student">Student Required</label>
            </div>

            <div className="checkbox-group" style={{ paddingTop: 0 }}>
              <input
                id="disability"
                name="disability"
                type="checkbox"
                checked={formData.disability}
                onChange={handleChange}
              />
              <label htmlFor="disability">Disability (PwD) Required</label>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label htmlFor="eligibilityText">Eligibility Summary Text</label>
            <textarea
              id="eligibilityText"
              name="eligibilityText"
              rows={2}
              placeholder="Citizen-friendly textual summary of eligibility requirements..."
              value={formData.eligibilityText}
              onChange={handleChange}
              className="chat-textarea"
            />
          </div>
        </div>

        {/* 4. Required Documents */}
        <div className="form-card-section">
          <h3>
            <FiList /> 4. Required Documents Checklist
          </h3>
          <div className="form-group">
            <label htmlFor="documents">Documents (Enter each document on a new line)</label>
            <textarea
              id="documents"
              name="documents"
              rows={3}
              placeholder="e.g.&#10;Aadhaar Card&#10;Land Ownership Record (Khata/Khatoni)&#10;Active Bank Account Details"
              value={formData.documents}
              onChange={handleChange}
              className="chat-textarea"
              style={{ minHeight: '80px' }}
            />
          </div>
        </div>

        {/* 5. Application Process */}
        <div className="form-card-section">
          <h3>
            <FiSend /> 5. Step-by-Step Application Process
          </h3>
          <div className="form-group">
            <label htmlFor="applicationProcess">Steps (Enter each step on a new line)</label>
            <textarea
              id="applicationProcess"
              name="applicationProcess"
              rows={3}
              placeholder="e.g.&#10;Visit the official PM-KISAN portal&#10;Click on 'New Farmer Registration'&#10;Authenticate using Aadhaar and mobile OTP"
              value={formData.applicationProcess}
              onChange={handleChange}
              className="chat-textarea"
              style={{ minHeight: '80px' }}
            />
          </div>
        </div>

        {/* 6. Verification & Official Portal */}
        <div className="form-card-section">
          <h3>
            <FiGlobe /> 6. Official Portal & Verification
          </h3>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="officialWebsite">Official Government Application Portal URL</label>
              <input
                id="officialWebsite"
                name="officialWebsite"
                type="url"
                placeholder="https://pmkisan.gov.in"
                value={formData.officialWebsite}
                onChange={handleChange}
              />
              <span className="form-help-text">Must be a valid HTTP/HTTPS link to official government website</span>
            </div>

            <div className="form-group">
              <label htmlFor="source">Source Reference / Notification</label>
              <input
                id="source"
                name="source"
                type="text"
                placeholder="e.g. Ministry of Agriculture & Farmers Welfare Gazette"
                value={formData.source}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="checkbox-group" style={{ marginTop: '1rem', paddingTop: 0 }}>
            <input
              id="isActive"
              name="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={handleChange}
            />
            <label htmlFor="isActive">
              <strong>Active Scheme</strong> (Deactivated schemes are hidden from public citizen search)
            </label>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions-row">
          <Link to="/admin/schemes" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? (
              <>
                <span className="btn-spinner"></span>
                <span>Saving Scheme...</span>
              </>
            ) : (
              <>
                <FiSave />
                <span>{isEditing ? 'Update Scheme' : 'Create Scheme'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminSchemeForm;
