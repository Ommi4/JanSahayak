import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { conversationAPI } from '../services/api';
import { FiFileText, FiMessageSquare, FiCheckCircle, FiArrowRight, FiClock } from 'react-icons/fi';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchConversations = async () => {
      try {
        const res = await conversationAPI.getAll();
        if (isMounted) {
          setConversations(res.data.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError('Unable to load recent conversations');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchConversations();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="dashboard-container">
      {/* Hero Welcome */}
      <div className="dashboard-hero">
        <div className="hero-welcome">
          <div>
            <h1>Welcome, {user?.name || 'Citizen'}!</h1>
            <p>
              JanSahayak is your intelligent intermediary for Indian government welfare schemes.
              Discover schemes, check deterministic eligibility, and get direct application guidance.
            </p>
          </div>
          <div className="hero-lang-badge">
            Preferred Language: {user?.preferredLanguage || 'English'}
          </div>
        </div>
      </div>

      {/* Main Quick Actions */}
      <div className="quick-actions-grid">
        <Link to="/schemes" className="action-card">
          <div className="action-card-header">
            <span className="action-icon">📜</span>
            <h3>Discover Schemes</h3>
          </div>
          <p>
            Explore verified central and state government schemes across agriculture, education, healthcare, and welfare.
          </p>
          <div className="action-card-footer">
            <span>Browse schemes</span>
            <FiArrowRight />
          </div>
        </Link>

        <Link to="/schemes" className="action-card">
          <div className="action-card-header">
            <span className="action-icon">✅</span>
            <h3>Check Eligibility</h3>
          </div>
          <p>
            Evaluate your profile deterministically against verified government rules without guesswork.
          </p>
          <div className="action-card-footer">
            <span>Verify eligibility</span>
            <FiArrowRight />
          </div>
        </Link>

        <Link to="/chat" className="action-card">
          <div className="action-card-header">
            <span className="action-icon">💬</span>
            <h3>Ask JanSahayak</h3>
          </div>
          <p>
            Chat with the citizen assistant in English, Hindi, or Telugu for scheme discovery and application steps.
          </p>
          <div className="action-card-footer">
            <span>Start chatting</span>
            <FiArrowRight />
          </div>
        </Link>
      </div>

      {/* Recent Conversations */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>
            <FiClock /> Recent Conversations
          </h2>
          {conversations.length > 0 && (
            <Link to="/chat" className="section-action-link">
              View all in Chat
            </Link>
          )}
        </div>

        {loading ? (
          <div className="loading-screen" style={{ minHeight: '120px' }}>
            <div className="spinner"></div>
            <p>Loading conversations...</p>
          </div>
        ) : error ? (
          <div className="auth-error-alert">{error}</div>
        ) : conversations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <p>You haven't started any conversations with JanSahayak yet.</p>
            <Link to="/chat" className="btn-primary">
              <FiMessageSquare /> Start New Conversation
            </Link>
          </div>
        ) : (
          <div className="recent-conversations-list">
            {conversations.slice(0, 4).map((conv) => (
              <Link to={`/chat?id=${conv._id}`} key={conv._id} className="conversation-card">
                <div className="conv-header">
                  <span className="conv-title">{conv.title || 'New Conversation'}</span>
                  <span className="conv-lang-tag">{conv.language || 'en'}</span>
                </div>
                <span className="conv-date">{formatDate(conv.updatedAt || conv.createdAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* JanSahayak Principles / Guidance */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>
            <FiCheckCircle /> How JanSahayak Assists You
          </h2>
        </div>
        <div className="guidance-grid">
          <div className="guidance-item">
            <span className="guidance-bullet">🎯</span>
            <div>
              <h4>Authoritative Rules</h4>
              <p>Eligibility is evaluated by deterministic backend rules directly matching official guidelines.</p>
            </div>
          </div>
          <div className="guidance-item">
            <span className="guidance-bullet">🌐</span>
            <div>
              <h4>Multilingual Support</h4>
              <p>Interact naturally in English, Hindi (हिंदी), or Telugu (తెలుగు) with structured responses.</p>
            </div>
          </div>
          <div className="guidance-item">
            <span className="guidance-bullet">🔗</span>
            <div>
              <h4>Official Portals Only</h4>
              <p>Access direct, authentic government application URLs without third-party redirects.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
