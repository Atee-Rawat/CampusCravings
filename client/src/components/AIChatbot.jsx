import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Bot, ChefHat, Send, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import '../styles/AIChatbot.css';

const QUICK_REPLIES = [
    'Suggest high protein meals',
    'Low calorie options',
    'Meal plan under 300',
    'Peanut-free safe options',
    'Is this good for muscle gain?'
];

const STORAGE_PREFIX = 'campuscravings-ai-chat';
const OPEN_STATE_SUFFIX = ':open';
const INTRO_SEEN_SUFFIX = ':intro-seen';
const LAST_SEEN_SUFFIX = ':last-seen-assistant-count';

const createSessionId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getStorageKey = (userId, sessionId) => `${STORAGE_PREFIX}:${userId}:${sessionId}`;
const getOpenStateKey = (userId) => `${STORAGE_PREFIX}:${userId}${OPEN_STATE_SUFFIX}`;
const getIntroSeenKey = (userId) => `${STORAGE_PREFIX}:${userId}${INTRO_SEEN_SUFFIX}`;
const getLastSeenKey = (userId) => `${STORAGE_PREFIX}:${userId}${LAST_SEEN_SUFFIX}`;

const formatMoney = (price) => {
    if (typeof price !== 'number') return 'N/A';
    return `₹${(price / 100).toFixed(2)}`;
};

const formatNutrition = (nutrition = {}) => {
    const parts = [];
    if (nutrition.calories != null) parts.push(`${nutrition.calories} cal`);
    if (nutrition.protein != null) parts.push(`${nutrition.protein}g protein`);
    if (nutrition.carbs != null) parts.push(`${nutrition.carbs}g carbs`);
    return parts.join(' • ');
};

const countAssistantMessages = (chatMessages) => chatMessages.filter((message) => message.role === 'assistant').length;

const MarkdownText = ({ text }) => {
    if (!text) return null;

    const lines = String(text).split('\n');

    const renderInline = (line, lineIndex) => {
        const parts = [];
        const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(line)) !== null) {
            if (match.index > lastIndex) {
                parts.push(line.slice(lastIndex, match.index));
            }

            const token = match[0];
            if (token.startsWith('**')) {
                parts.push(<strong key={`${lineIndex}-b-${match.index}`}>{token.slice(2, -2)}</strong>);
            } else if (token.startsWith('`')) {
                parts.push(
                    <code
                        key={`${lineIndex}-c-${match.index}`}
                        style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace' }}
                    >
                        {token.slice(1, -1)}
                    </code>
                );
            }

            lastIndex = match.index + token.length;
        }

        if (lastIndex < line.length) {
            parts.push(line.slice(lastIndex));
        }

        return parts.length ? parts : line;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {lines.map((line, index) => {
                const trimmed = line.trim();

                if (!trimmed) {
                    return <div key={`${index}-blank`} style={{ height: '8px' }} />;
                }

                if (trimmed.startsWith('- ')) {
                    return (
                        <div key={`${index}-li`} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <span style={{ marginTop: '8px', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-500)', flexShrink: 0 }} />
                            <div>{renderInline(trimmed.slice(2), index)}</div>
                        </div>
                    );
                }

                return <p key={`${index}-p`} style={{ margin: 0 }}>{renderInline(line, index)}</p>;
            })}
        </div>
    );
};

MarkdownText.propTypes = {
    text: PropTypes.string
};

const ChatMessage = ({ message, onSuggestionClick, onAddToCart }) => {
    const isUser = message.role === 'user';

    return (
        <div className={`ai-message-row ${isUser ? 'user' : 'assistant'}`}>
            <div className="ai-message-bubble">
                <MarkdownText text={message.content} />

                {Array.isArray(message.suggestions) && message.suggestions.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                        {message.suggestions.map((suggestion, index) => {
                            const menuItem = suggestion.menuItem || {};
                            const hasOutlet = Boolean(menuItem.outlet);
                            return (
                                <div
                                    key={`${message.id}-suggestion-${index}`}
                                    className="ai-suggestion-card"
                                >
                                    <div className="ai-suggestion-image">
                                        {menuItem.image ? (
                                            <img src={menuItem.image} alt={menuItem.name || 'Menu item'} />
                                        ) : (
                                            <ChefHat size={24} />
                                        )}
                                    </div>
                                    <div className="ai-suggestion-details">
                                        <div className="ai-suggestion-header">
                                            <div style={{ overflow: 'hidden' }}>
                                                <p className="ai-suggestion-name">{menuItem.name || 'Suggested option'}</p>
                                                <p className="ai-suggestion-category">{menuItem.category || 'Campus menu'}</p>
                                            </div>
                                            <span className="ai-suggestion-price">
                                                {formatMoney(menuItem.price)}
                                            </span>
                                        </div>
                                        <p className="ai-suggestion-reason">{suggestion.reason}</p>
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            {formatNutrition(menuItem.nutrition)}
                                        </p>
                                        <div className="ai-suggestion-actions">
                                            <button
                                                type="button"
                                                onClick={() => onAddToCart?.(suggestion)}
                                                className="ai-suggestion-action-btn primary"
                                            >
                                                Add to cart
                                            </button>
                                            {hasOutlet && (
                                                <button
                                                    type="button"
                                                    onClick={() => onSuggestionClick?.(suggestion)}
                                                    className="ai-suggestion-action-btn secondary"
                                                >
                                                    View outlet
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

ChatMessage.propTypes = {
    message: PropTypes.object.isRequired,
    onSuggestionClick: PropTypes.func,
    onAddToCart: PropTypes.func
};

const TypingIndicator = () => (
    <div className="ai-message-row assistant">
        <div className="ai-typing-indicator">
            <Bot size={16} />
            <span style={{ marginLeft: '4px', marginRight: '4px' }}>AI Nutritionist is typing</span>
            <div className="ai-typing-dot"></div>
            <div className="ai-typing-dot"></div>
            <div className="ai-typing-dot"></div>
        </div>
    </div>
);

const AIChatbot = ({
    userId: userIdProp,
    currentMenuItemId = null,
    onNavigateToItem,
    title = 'AI Nutritionist'
}) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addItem } = useCart();

    const userId = userIdProp || user?._id || user?.id || null;
    const sessionStorageKeyRef = useRef(null);
    const messagesEndRef = useRef(null);

    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState([]);
    const [sessionId, setSessionId] = useState('');
    const [input, setInput] = useState('');
    const [hasLoaded, setHasLoaded] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const lastSeenAssistantCountRef = useRef(0);

    useEffect(() => {
        if (!userId) return;

        const storedSessionId = localStorage.getItem(`${STORAGE_PREFIX}:session:${userId}`);
        const nextSessionId = storedSessionId || createSessionId();
        setSessionId(nextSessionId);
        localStorage.setItem(`${STORAGE_PREFIX}:session:${userId}`, nextSessionId);
        sessionStorageKeyRef.current = getStorageKey(userId, nextSessionId);

        const storedOpenState = localStorage.getItem(getOpenStateKey(userId));
        if (storedOpenState !== null) {
            setIsOpen(storedOpenState === 'true');
        }

        const storedLastSeen = Number(localStorage.getItem(getLastSeenKey(userId)) || '0');
        lastSeenAssistantCountRef.current = Number.isFinite(storedLastSeen) ? storedLastSeen : 0;

        const savedMessages = localStorage.getItem(sessionStorageKeyRef.current);
        if (savedMessages) {
            try {
                setMessages(JSON.parse(savedMessages));
            } catch {
                setMessages([]);
            }
        }

        setHasLoaded(true);
    }, [userId]);

    useEffect(() => {
        if (!hasLoaded || !userId) return;

        localStorage.setItem(getOpenStateKey(userId), String(isOpen));
    }, [hasLoaded, isOpen, userId]);

    useEffect(() => {
        if (!hasLoaded || !userId) return;

        const assistantCount = countAssistantMessages(messages);

        if (isOpen) {
            lastSeenAssistantCountRef.current = assistantCount;
            localStorage.setItem(getLastSeenKey(userId), String(assistantCount));
            setUnreadCount(0);
            return;
        }

        const nextUnread = Math.max(assistantCount - lastSeenAssistantCountRef.current, 0);
        setUnreadCount(nextUnread);
    }, [hasLoaded, isOpen, messages, userId]);

    useEffect(() => {
        if (!hasLoaded || !userId) return;

        const introSeen = localStorage.getItem(getIntroSeenKey(userId));
        if (introSeen === 'true') return;
        if (messages.length > 0) return;

        const timer = window.setTimeout(() => {
            setIsOpen(true);
            localStorage.setItem(getIntroSeenKey(userId), 'true');
        }, 350);

        return () => window.clearTimeout(timer);
    }, [hasLoaded, messages.length, userId]);

    useEffect(() => {
        if (!hasLoaded || !userId || !sessionId) return;
        localStorage.setItem(sessionStorageKeyRef.current, JSON.stringify(messages));
    }, [messages, hasLoaded, userId, sessionId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const sendMessage = async (messageText) => {
        const trimmedMessage = (messageText || input).trim();
        if (!trimmedMessage || !userId || isLoading) return;

        const userMessage = {
            id: createSessionId(),
            role: 'user',
            content: trimmedMessage,
            createdAt: new Date().toISOString()
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const payload = {
                message: trimmedMessage,
                userId,
                sessionId
            };

            if (currentMenuItemId) payload.currentMenuItemId = currentMenuItemId;

            const response = await api.post('/ai/chat', payload);

            const data = response.data?.data || {};
            const aiMessage = {
                id: createSessionId(),
                role: 'assistant',
                content: data.response || 'I could not generate a response right now.',
                suggestions: data.suggestions || [],
                sources: data.sources || [],
                createdAt: new Date().toISOString()
            };

            setMessages((prev) => [...prev, aiMessage]);
            if (data.sessionId && data.sessionId !== sessionId) {
                setSessionId(data.sessionId);
                localStorage.setItem(`${STORAGE_PREFIX}:session:${userId}`, data.sessionId);
                sessionStorageKeyRef.current = getStorageKey(userId, data.sessionId);
            }
        } catch (error) {
                console.error('AI chat error:', error);
                const serverMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Failed to get AI nutrition advice';
                toast.error(serverMessage);

                setMessages((prev) => [...prev, {
                    id: createSessionId(),
                    role: 'assistant',
                    content: serverMessage || 'I could not respond right now. Please try again in a moment.',
                    suggestions: [],
                    sources: [],
                    createdAt: new Date().toISOString(),
                    isError: true
                }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        if (!suggestion?.menuItem) return;

        const menuItem = suggestion.menuItem;
        const menuItemId = menuItem._id || menuItem.id;
        const target = menuItem.outlet?.slug
            ? `/outlet/${menuItem.outlet.slug}`
            : menuItem.outlet?.id
                ? `/outlet/${menuItem.outlet.id}`
                : null;

        if (typeof onNavigateToItem === 'function') {
            onNavigateToItem(menuItem);
            return;
        }

        if (target) {
            navigate(target, {
                state: { menuItemId, highlightMenuItemId: menuItemId }
            });
        }
    };

    const handleAddToCart = (suggestion) => {
        const menuItem = suggestion?.menuItem;
        if (!menuItem) return;

        const added = addItem(menuItem, menuItem.outlet || suggestion?.outlet || null);
        if (added) {
            toast.success(`${menuItem.name || 'Item'} added to cart`);
        }
    };

    const handleQuickReply = (text) => {
        setInput(text);
        if (!isOpen) {
            setIsOpen(true);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        await sendMessage();
    };

    const suggestedChips = useMemo(() => QUICK_REPLIES, []);

    const openLabel = isOpen ? 'Close AI Nutritionist' : 'Open AI Nutritionist';

    const toggleChat = () => {
        setIsOpen((value) => !value);
        if (isOpen) {
            const assistantCount = countAssistantMessages(messages);
            lastSeenAssistantCountRef.current = assistantCount;
            localStorage.setItem(getLastSeenKey(userId), String(assistantCount));
            setUnreadCount(0);
        }
    };

    if (!userId) {
        return null;
    }

    return (
        <div className="ai-chatbot-wrapper">
            <button
                type="button"
                onClick={toggleChat}
                aria-label={openLabel}
                className="ai-chatbot-button"
            >
                <Bot size={28} />
                {unreadCount > 0 && !isOpen && (
                    <span className="ai-chatbot-badge">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="ai-chatbot-overlay" onClick={() => setIsOpen(false)}></div>
                    <section className="ai-chatbot-window">
                        <header className="ai-chatbot-header">
                            <div className="ai-chatbot-header-info">
                                <div className="ai-chatbot-header-icon">
                                    <Bot size={24} />
                                </div>
                                <div>
                                    <h3 className="ai-chatbot-header-title">{title}</h3>
                                    <p className="ai-chatbot-header-subtitle">Healthy, budget-friendly guidance</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="ai-chatbot-close"
                                aria-label="Close chat"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        <div className="ai-chatbot-messages">
                            {messages.length === 0 && !isLoading && (
                                <div style={{ 
                                    padding: '16px', 
                                    textAlign: 'center', 
                                    color: 'var(--text-muted)',
                                    background: 'var(--bg-elevated)',
                                    borderRadius: '12px',
                                    border: '1px dashed var(--border-medium)',
                                    fontSize: '14px'
                                }}>
                                    Ask me about calories, muscle gain, allergies, meal plans, or what fits your budget.
                                </div>
                            )}

                            {messages.map((message) => (
                                <ChatMessage
                                    key={message.id}
                                    message={message}
                                    onSuggestionClick={handleSuggestionClick}
                                    onAddToCart={handleAddToCart}
                                />
                            ))}
                            {isLoading && <TypingIndicator />}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="ai-chatbot-footer">
                            <div className="ai-quick-replies">
                                {suggestedChips.map((chip) => (
                                    <button
                                        key={chip}
                                        type="button"
                                        onClick={() => handleQuickReply(chip)}
                                        className="ai-quick-reply-btn"
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>

                            <form onSubmit={handleSubmit} className="ai-input-form">
                                <div className="ai-input-container">
                                    <textarea
                                        value={input}
                                        onChange={(event) => setInput(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' && !event.shiftKey) {
                                                event.preventDefault();
                                                handleSubmit(event);
                                            }
                                        }}
                                        placeholder="Ask about calories, protein..."
                                        className="ai-textarea"
                                        rows={1}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="ai-submit-btn"
                                    aria-label="Send message"
                                >
                                    <Send size={20} />
                                </button>
                            </form>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

AIChatbot.propTypes = {
    userId: PropTypes.string,
    currentMenuItemId: PropTypes.string,
    onNavigateToItem: PropTypes.func,
    title: PropTypes.string
};

export default AIChatbot;
