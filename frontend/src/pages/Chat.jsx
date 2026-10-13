import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { conversationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FiSend,
  FiPlus,
  FiMessageSquare,
  FiUser,
  FiCpu,
  FiGlobe,
  FiExternalLink,
} from 'react-icons/fi';
import './Chat.css';

const QUICK_PROMPTS = {
  en: [
    'What schemes are available for farmers?',
    'Am I eligible for PM-KISAN?',
    'Tell me about Ayushman Bharat',
    'Where can I apply for PMAY?',
  ],
  hi: [
    'किसानों के लिए कौन सी योजनाएं उपलब्ध हैं?',
    'क्या मैं पीएम-किसान के लिए पात्र हूँ?',
    'आयुष्मान भारत के बारे में बताएं',
    'पीएम आवास योजना के लिए कहाँ आवेदन करें?',
  ],
  te: [
    'రైతులకు ఏ సంక్షేమ పథకాలు ఉన్నాయి?',
    'నేను పిఎం-కిసాన్‌కు అర్హుడినా?',
    'ఆయుష్మాన్ భారత్ వివరాలు తెలపండి',
    'వైఎస్సార్ రైతు భరోసా పథకం గురించి చెప్పండి',
  ],
};

const Chat = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryConvId = searchParams.get('id');

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingConvList, setLoadingConvList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [newChatLang, setNewChatLang] = useState(
    user?.preferredLanguage === 'Hindi'
      ? 'hi'
      : user?.preferredLanguage === 'Telugu'
      ? 'te'
      : 'en'
  );

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch all conversations on mount
  const fetchConversations = useCallback(async (selectId = null) => {
    try {
      const res = await conversationAPI.getAll();
      const list = res.data.data || [];
      setConversations(list);

      if (list.length > 0) {
        const targetId = selectId || queryConvId || list[0]._id;
        const found = list.find((c) => c._id === targetId) || list[0];
        setActiveConv(found);
      } else {
        setActiveConv(null);
        setMessages([]);
      }
    } catch (err) {
      setError('Unable to load conversation history');
    } finally {
      setLoadingConvList(false);
    }
  }, [queryConvId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load messages when activeConv changes
  useEffect(() => {
    if (!activeConv?._id) return;

    let isMounted = true;
    const fetchMessages = async () => {
      setLoadingMessages(true);
      setError('');
      try {
        const res = await conversationAPI.getById(activeConv._id);
        if (isMounted) {
          setMessages(res.data.data.messages || []);
        }
      } catch (err) {
        if (isMounted) {
          setError('Unable to load messages for this conversation');
        }
      } finally {
        if (isMounted) {
          setLoadingMessages(false);
        }
      }
    };

    fetchMessages();
    return () => {
      isMounted = false;
    };
  }, [activeConv?._id]);

  // Create a new conversation
  const handleCreateConversation = async () => {
    try {
      setSending(true);
      const res = await conversationAPI.create({
        language: newChatLang,
        title: 'New Conversation',
      });
      const newConv = res.data.data;
      setConversations((prev) => [newConv, ...prev]);
      setActiveConv(newConv);
      setMessages([]);
      setSearchParams({ id: newConv._id });
    } catch (err) {
      setError('Failed to create new conversation');
    } finally {
      setSending(false);
    }
  };

  // Switch conversation
  const handleSelectConv = (conv) => {
    setActiveConv(conv);
    setSearchParams({ id: conv._id });
  };

  // Send message
  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || messageInput).trim();
    if (!text || sending) return;

    let currentConv = activeConv;

    // If no active conversation exists, auto-create one first
    if (!currentConv) {
      try {
        const res = await conversationAPI.create({
          language: newChatLang,
          title: text.slice(0, 30),
        });
        currentConv = res.data.data;
        setConversations((prev) => [currentConv, ...prev]);
        setActiveConv(currentConv);
        setSearchParams({ id: currentConv._id });
      } catch (err) {
        setError('Failed to initialize conversation');
        return;
      }
    }

    setMessageInput('');
    setSending(true);
    setError('');

    // Optimistic UI for user message
    const tempUserMsg = {
      _id: `temp_${Date.now()}`,
      sender: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await conversationAPI.sendMessage(currentConv._id, text);
      const { userMessage, assistantMessage } = res.data.data;

      // Replace temp message and append assistant message
      setMessages((prev) => {
        const filtered = prev.filter((m) => m._id !== tempUserMsg._id);
        return [...filtered, userMessage, assistantMessage];
      });

      // Update conversation list title/updatedAt
      setConversations((prev) =>
        prev.map((c) =>
          c._id === currentConv._id
            ? { ...c, title: text.slice(0, 35), updatedAt: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to send message. Please ensure the backend is active.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentLangCode = activeConv?.language || newChatLang || 'en';
  const quickPromptsList = QUICK_PROMPTS[currentLangCode] || QUICK_PROMPTS.en;

  const formatMessageContent = (content) => {
    if (!content) return null;

    // Simple markdown-style rendering for bold, links, and line breaks
    return content.split('\n').map((line, lineIdx) => {
      // Bold rendering
      const parts = line.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
      return (
        <span key={lineIdx} style={{ display: 'block', minHeight: '1.2em' }}>
          {parts.map((part, partIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
            }
            const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
            if (linkMatch) {
              return (
                <a
                  key={partIdx}
                  href={linkMatch[2]}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0284c7', textDecoration: 'underline' }}
                >
                  {linkMatch[1]}
                </a>
              );
            }
            return part;
          })}
        </span>
      );
    });
  };

  return (
    <div className="chat-layout">
      {/* Sidebar: Conversation History */}
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <button
            onClick={handleCreateConversation}
            className="new-chat-btn"
            disabled={sending}
          >
            <FiPlus /> New Conversation
          </button>

          <div className="lang-picker-group">
            <FiGlobe />
            <span>Language:</span>
            <select
              className="lang-select-mini"
              value={newChatLang}
              onChange={(e) => setNewChatLang(e.target.value)}
            >
              <option value="en">English (EN)</option>
              <option value="hi">हिंदी (HI)</option>
              <option value="te">తెలుగు (TE)</option>
            </select>
          </div>
        </div>

        <div className="conversations-scroll">
          {loadingConvList ? (
            <div className="loading-screen" style={{ minHeight: '100px' }}>
              <div className="spinner"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem 0.5rem' }}>
              <p style={{ fontSize: '0.85rem' }}>No conversations yet. Start a new one above!</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv._id}
                onClick={() => handleSelectConv(conv)}
                className={`conv-item ${activeConv?._id === conv._id ? 'active' : ''}`}
              >
                <div className="conv-item-top">
                  <span className="conv-item-title">
                    <FiMessageSquare style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    {conv.title || 'New Conversation'}
                  </span>
                  <span className="conv-item-lang">{conv.language || 'en'}</span>
                </div>
                <span className="conv-item-time">
                  {new Date(conv.updatedAt || conv.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-main">
        {/* Chat Header */}
        <div className="chat-header">
          <div className="chat-header-info">
            <h2>{activeConv?.title || 'JanSahayak Citizen Assistant'}</h2>
            <div className="chat-header-meta">
              <span>Language: <strong>{activeConv?.language?.toUpperCase() || newChatLang.toUpperCase()}</strong></span>
              <span>•</span>
              <span>AI Mode: <strong>Verified Deterministic Fallback</strong></span>
            </div>
          </div>
        </div>

        {error && <div className="auth-error-alert" style={{ margin: '0.75rem 1.25rem' }}>{error}</div>}

        {/* Message Thread */}
        <div className="chat-messages">
          {loadingMessages ? (
            <div className="loading-screen">
              <div className="spinner"></div>
              <p>Loading conversation messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-state" style={{ margin: 'auto' }}>
              <div className="empty-state-icon">🏛️</div>
              <h3>How can JanSahayak assist you?</h3>
              <p>
                Ask about government welfare schemes, check your eligibility criteria,
                or request official portal application steps.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg._id}
                className={`message-row ${msg.sender === 'user' ? 'user' : 'assistant'}`}
              >
                <div
                  className={`message-avatar ${
                    msg.sender === 'user' ? 'avatar-user' : 'avatar-assistant'
                  }`}
                >
                  {msg.sender === 'user' ? <FiUser /> : <FiCpu />}
                </div>
                <div className="message-bubble-wrapper">
                  <div className="message-bubble">
                    {formatMessageContent(msg.content)}

                    {/* Show structured schemes if available */}
                    {msg.metadata?.schemes && msg.metadata.schemes.length > 0 && (
                      <div style={{ marginTop: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                        {msg.metadata.schemes.map((s) => (
                          <div
                            key={s.id || s.name}
                            style={{
                              background: '#fff',
                              padding: '0.4rem 0.6rem',
                              borderRadius: '4px',
                              marginBottom: '0.35rem',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.85rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <strong>{s.name}</strong>
                            {s.officialWebsite && (
                              <a
                                href={s.officialWebsite}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              >
                                <span>Portal</span>
                                <FiExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="message-time">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="message-row assistant">
              <div className="message-avatar avatar-assistant">
                <FiCpu />
              </div>
              <div className="message-bubble" style={{ fontStyle: 'italic', color: '#64748b' }}>
                JanSahayak is evaluating verified schemes...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Bar */}
        <div className="quick-prompts-bar">
          {quickPromptsList.map((prompt, idx) => (
            <button
              key={idx}
              className="prompt-pill"
              onClick={() => handleSendMessage(prompt)}
              disabled={sending}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="chat-input-area">
          <div className="chat-input-box">
            <textarea
              className="chat-textarea"
              placeholder={`Type your message in ${
                currentLangCode === 'hi'
                  ? 'Hindi (हिंदी)'
                  : currentLangCode === 'te'
                  ? 'Telugu (తెలుగు)'
                  : 'English'
              }...`}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              rows={1}
              maxLength={2000}
            />
          </div>
          <button
            onClick={() => handleSendMessage()}
            className="chat-send-btn"
            disabled={sending || !messageInput.trim()}
            title="Send Message"
          >
            {sending ? <span className="btn-spinner"></span> : <FiSend />}
          </button>
        </div>
      </main>
    </div>
  );
};

export default Chat;
