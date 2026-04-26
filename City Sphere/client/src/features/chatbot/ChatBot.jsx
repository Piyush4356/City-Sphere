import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import {
    MessageCircle, X, Send, Bot, ChevronDown,
    MapPin, Navigation, Compass, Heart, AlertCircle,
    FileText, Map, UserCircle, Info, Loader2, Sparkles
} from 'lucide-react';
import { ExploreContext } from '../../context/ExploreContext';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// ─── Quick-reply suggestion flows (City Sphere version of Lexi) ──────────────
const MAIN_MENU = [
    { label: '📍 Explore Places', id: 'explore_places' },
    { label: '🗺️ Navigate to a Place', id: 'navigate_help' },
    { label: '❤️ Save a Place', id: 'save_place' },
    { label: '👤 My Profile', id: 'view_profile' },
    { label: '➕ Suggest a Place', id: 'suggest_place' },
    { label: '🚮 Waste & Water Schedule', id: 'city_services' },
    { label: '🆘 Emergency Help', id: 'emergency' },
    { label: '💬 Give Feedback', id: 'give_feedback' },
    { label: '🔐 Account Help', id: 'account' },
    { label: '🎧 Contact Customer Support', id: 'support_mode', highlight: true },
];

const BOT_FLOWS = {
    explore_places: {
        text: "Great! 🌟 The **Explore** page shows famous monuments, temples, parks, forts, and hidden gems in your current city.\n\nEach place card shows:\n• 📸 A real photo of the place\n• ⭐ Star rating\n• 📍 Distance from you\n• Navigate & Explore buttons",
        quickReplies: [
            { label: '🗺️ Go to Explore Page', id: 'goto_explore' },
            { label: '⭐ Best Recommendation', id: 'best_recommendation' },
            { label: '🔍 Filter by Category', id: 'filter_help' },
            { label: '🏠 Main Menu', id: 'main_menu' },
        ],
    },
    goto_explore: {
        text: "Taking you to the **Explore** page now! 🚀 Discover the best places in your city.",
        action: 'navigate',
        path: '/explore',
        quickReplies: [{ label: '🏠 Main Menu', id: 'main_menu' }],
    },
    filter_help: {
        text: "On the **Explore** page you can filter places by:\n\n🏛️ **Monuments** — temples, shrines, memorials\n🏰 **Forts** — forts, palaces, mahal\n🏛 **Museums** — museums, galleries\n🌳 **Parks** — parks, gardens, reserves\n🌊 **Nature** — waterfalls, caves, peaks, lakes\n✨ **Attractions** — all other tourist spots\n\nJust click the category pill to filter!",
        quickReplies: [
            { label: '🗺️ Go to Explore', id: 'goto_explore' },
            { label: '🏠 Main Menu', id: 'main_menu' },
        ],
    },
    navigate_help: {
        text: "Navigation is easy! 🗺️\n\n1. Go to the **Explore** page\n2. Find a place you want to visit\n3. Click the **Navigate** button (orange)\n4. You'll be taken to the **Map** with a route drawn from your location to the destination!",
        quickReplies: [
            { label: '🗺️ Go to Explore', id: 'goto_explore' },
            { label: '🗺️ Go to Map', id: 'goto_map' },
            { label: '🏠 Main Menu', id: 'main_menu' },
        ],
    },
    goto_map: {
        text: "Taking you to the **Map** page! 📍 You can search for any location and get directions.",
        action: 'navigate',
        path: '/map',
        quickReplies: [{ label: '🏠 Main Menu', id: 'main_menu' }],
    },
    save_place: {
        text: "Saving a place is simple! ❤️\n\n1. Open the **Explore** page\n2. Find a place you love\n3. Click the **Bookmark** icon on the place card\n4. It gets securely saved to your **Profile** page!\n\nYou can view all your bookmarked gems in your profile anytime.",
        quickReplies: [
            { label: '🗺️ Go to Explore', id: 'goto_explore' },
            { label: '👤 View My Profile', id: 'goto_profile' },
            { label: '🏠 Main Menu', id: 'main_menu' },
        ],
    },
    view_profile: {
        text: "Your **Profile** page is your personal hub! 👤\n\nThere you can:\n• 🖼️ Update your profile picture\n• 📱 Edit your name and phone number\n• ❤️ View all your **Bookmarked Places**\n\nClick below to check it out!",
        quickReplies: [
            { label: '👤 Go to Profile', id: 'goto_profile' },
            { label: '🏠 Main Menu', id: 'main_menu' },
        ],
    },
    goto_profile: {
        text: "Taking you to your **Profile**! 👤 Customize your identity and see your saved spots.",
        action: 'navigate',
        path: '/profile',
        quickReplies: [{ label: '🏠 Main Menu', id: 'main_menu' }],
    },
    suggest_place: {
        text: "You can help build the community map! 🌍\n\n1. Go to the **Explore** page\n2. Click the **Suggest a Place** button (top right)\n3. Fill in the name, category, description, and upload a photo\n4. Your suggestion goes to the admin for review\n5. Once approved, it appears for everyone! 🎉\n\nYour current GPS location is used automatically.",
        quickReplies: [
            { label: '🗺️ Go to Explore', id: 'goto_explore' },
            { label: '🏠 Main Menu', id: 'main_menu' },
        ],
    },
    city_services: {
        text: "🚮 **City Services Dashboard:**\n\nThe **Dashboard** shows your city's live:\n• 🚛 Waste Collection days and timings\n• 💧 Water Supply frequency and hours\n\nThese are real-time schedules for your detected city. Go to the Dashboard to view them!",
        quickReplies: [
            { label: '📊 Go to Dashboard', id: 'goto_dashboard' },
            { label: '🏠 Main Menu', id: 'main_menu' },
        ],
    },
    goto_dashboard: {
        text: "Taking you to the **Dashboard** now! 📊 Your city's live services are waiting.",
        action: 'navigate',
        path: '/',
        quickReplies: [{ label: '🏠 Main Menu', id: 'main_menu' }],
    },
    emergency: {
        text: "🆘 **Emergency help is available:**\n\nThe **Emergency** page has quick-access contacts for:\n• 🚔 Police — 100\n• 🔥 Fire — 101\n• 🚑 Ambulance — 108\n• 👶 Women Helpline — 1091\n\nGo to Emergency in the top navigation bar right now if you need immediate help.",
        quickReplies: [
            { label: '🏠 Main Menu', id: 'main_menu' },
        ],
    },
    account: {
        text: "👤 **Account Help:**\n\nWhat do you need help with?",
        quickReplies: [
            { label: '🔐 Login', id: 'goto_login' },
            { label: '📝 Register', id: 'goto_register' },
            { label: '🔑 Forgot Password', id: 'goto_forgot' },
            { label: '🏠 Main Menu', id: 'main_menu' },
        ],
    },
    goto_login: {
        text: "Heading to the **Login** page! 👋",
        action: 'navigate',
        path: '/login',
        quickReplies: [{ label: '🏠 Main Menu', id: 'main_menu' }],
    },
    goto_register: {
        text: "Let's get you set up! Heading to **Register**. 🎉",
        action: 'navigate',
        path: '/register',
        quickReplies: [{ label: '🏠 Main Menu', id: 'main_menu' }],
    },
    goto_forgot: {
        text: "Heading to **Forgot Password**. We'll get you back in! 🔑",
        action: 'navigate',
        path: '/forgot-password',
        quickReplies: [{ label: '🏠 Main Menu', id: 'main_menu' }],
    },
    give_feedback: {
        text: "💬 **City Feedback:**\n\nHave a suggestion or complaint? You can give feedback on your city's transport, healthcare, waste management, and more on the **Feedback** page!\n\nYou can also rate the overall 'Ease of Living' for your city.",
        quickReplies: [
            { label: '📝 Go to Feedback', id: 'goto_feedback' },
            { label: '🏠 Main Menu', id: 'main_menu' },
        ],
    },
    goto_feedback: {
        text: "Taking you to the **Feedback** page! 🚀 Thank you for helping improve the city.",
        action: 'navigate',
        path: '/feedback',
        quickReplies: [{ label: '🏠 Main Menu', id: 'main_menu' }],
    },
    main_menu: {
        text: "Of course! How else can I help you? 😊",
        quickReplies: MAIN_MENU,
    },
    support_mode: {
        text: "🎧 **Customer Support**\n\nPlease type your problem or question below, and I will forward it to our support team. We will get back to you at your registered email address.",
        isSupportMode: true,
        quickReplies: [{ label: '🏠 Back to Menu', id: 'main_menu' }],
    },
};

// ─── Simple keyword intent detection ─────────────────────────────────────────
function detectIntent(text) {
    const t = text.toLowerCase();
    if (/\b(explor|place|spot|visit|tourist|monument|temple|fort|museum|park)\b/.test(t)) {
        if (/\b(best|top|highly|popular|recommend|favorite|famous)\b/.test(t)) return 'best_recommendation';
        return 'explore_places';
    }
    if (/\b(navigate|navigat|direction|route|go to|how to reach)\b/.test(t)) return 'navigate_help';
    if (/\b(save|bookmark|heart|favourite|favorite)\b/.test(t)) return 'save_place';
    if (/\b(suggest|add|submit|new place|missing)\b/.test(t)) return 'suggest_place';
    if (/\b(waste|water|schedule|service|garbage|collection)\b/.test(t)) return 'city_services';
    if (/\b(emergency|police|fire|ambulance|help|sos)\b/.test(t)) return 'emergency';
    if (/\b(account|login|register|sign|password|forgot|otp)\b/.test(t)) return 'account';
    if (/\b(feedback|review|rate|complaint|idea)\b/.test(t)) return 'give_feedback';
    if (/\b(profile|my account|details|dp|phone|settings)\b/.test(t)) return 'view_profile';
    return null;
}

// ─── Format text: **bold** and newlines ──────────────────────────────────────
const formatText = (text) =>
    text.split('\n').map((line, i) => {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
            <span key={i}>
                {parts.map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part))}
                {i < text.split('\n').length - 1 && <br />}
            </span>
        );
    });

// ─── ChatBot Component ────────────────────────────────────────────────────────
const ChatBot = () => {
    const navigate = useNavigate();
    const { cityName, spots } = useContext(ExploreContext);
    const { user } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [supportMode, setSupportMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasGreeted, setHasGreeted] = useState(false);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const prevUserIdRef = useRef(user?._id || null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    // ── Only show chatbot for logged-in users ──
    // Reset chatbot state when user changes (different account)
    useEffect(() => {
        const currentUserId = user?._id || null;
        if (prevUserIdRef.current !== currentUserId) {
            // User changed — full reset
            setMessages([]);
            setIsOpen(false);
            setInput('');
            setIsTyping(false);
            setSupportMode(false);
            setIsLoading(false);
            setHasGreeted(false);
            prevUserIdRef.current = currentUserId;
        }
    }, [user]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // Don't render if not logged in
    if (!user) return null;

    const addBotMessage = (text, quickReplies = [], action = null, path = null, isSupportModeLocal = false, placeCards = []) => {
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            if (isSupportModeLocal) setSupportMode(true);
            setMessages(prev => [
                ...prev,
                { id: Date.now(), sender: 'bot', text, quickReplies, placeCards, timestamp: new Date() },
            ]);
            if (action === 'navigate' && path) {
                setTimeout(() => navigate(path), 1200);
            }
        }, 700);
    };

    const openChat = () => {
        setIsOpen(true);
        if (!hasGreeted) {
            setHasGreeted(true);
            setTimeout(() => {
                addBotMessage(
                    `Namaste! 👋 I'm **CityBot**, your guide to ${cityName || 'your city'}.\n\nHow can I help you today?`,
                    MAIN_MENU
                );
            }, 400);
        }
    };

    const handleQuickReply = (id) => {
        if (id === 'main_menu') setSupportMode(false);

        // Require authentication for customer support
        if (id === 'support_mode') {
            const token = localStorage.getItem('token');
            if (!token) {
                setMessages(prev => [
                    ...prev,
                    { id: Date.now(), sender: 'user', text: 'Contact Customer Support', timestamp: new Date() },
                ]);
                addBotMessage(
                    "You need to be logged in to contact customer support! We need your email to respond to you. 🔐",
                    [
                        { label: '🔐 Go to Login', id: 'goto_login' },
                        { label: '🏠 Main Menu', id: 'main_menu' }
                    ]
                );
                return;
            }
        }

        const labelMap = Object.fromEntries(
            [...MAIN_MENU, ...Object.values(BOT_FLOWS).flatMap(f => f.quickReplies || [])].map(r => [r.id, r.label.replace(/^[^\w\s]*\s*/, '').trim()])
        );
        const label = labelMap[id] || id;

        setMessages(prev => [
            ...prev,
            { id: Date.now(), sender: 'user', text: label, timestamp: new Date() },
        ]);

        const flow = BOT_FLOWS[id];
        if (flow) {
            addBotMessage(
                flow.text,
                flow.quickReplies || [],
                flow.action || null,
                flow.path || null,
                flow.isSupportMode || false
            );
        } else if (id === 'best_recommendation') {
            if (!spots || spots.length === 0) {
                addBotMessage(
                    "I'm still searching for the best spots in your city! Please try again in a moment. 🔍",
                    [{ label: '🏠 Main Menu', id: 'main_menu' }]
                );
            } else {
                const bestSpot = [...spots].sort((a, b) => b.rating - a.rating)[0];
                addBotMessage(
                    `The **#1 Rated Place** in ${cityName || 'your city'} is **${bestSpot.name}**! 🏆\n\nIt has a rating of **${bestSpot.rating.toFixed(1)} ⭐** and is located about **${bestSpot.distance.toFixed(1)} km** away.`,
                    [
                        { label: '🗺️ Go to Explore', id: 'goto_explore' },
                        { label: '🏠 Main Menu', id: 'main_menu' }
                    ],
                    null,
                    null,
                    false,
                    [bestSpot]
                );
            }
        }
    };

    // Free-text send (only used for Customer Support now)
    const handleSend = async (e) => {
        e?.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: trimmed, timestamp: new Date() }]);
        setInput('');

        if (supportMode) {
            // Forward problem to backend
            setIsLoading(true);
            setIsTyping(true);
            try {
                const token = localStorage.getItem('token');
                const response = await axios.post(`${API_URL}/api/chatbot/support`, {
                    message: trimmed
                }, { headers: { Authorization: `Bearer ${token}` } });

                setIsTyping(false);
                setIsLoading(false);
                setMessages(prev => [...prev, {
                    id: Date.now(), sender: 'bot', text: response.data.reply || "Your message has been received!",
                    quickReplies: [
                        { label: '🏠 Back to Menu', id: 'main_menu' }
                    ],
                    timestamp: new Date()
                }]);
                // Clear support mode once successfully submitted
                setSupportMode(false);
            } catch (err) {
                setIsTyping(false);
                setIsLoading(false);
                if (err.response?.status === 401) {
                    addBotMessage("Your session expired. Please log in again to contact support.", [
                        { label: '🔐 Go to Login', id: 'goto_login' }
                    ]);
                    setSupportMode(false);
                } else {
                    const errMsg = err.response?.data?.error || "I'm having trouble connecting to support right now 🙏 Please try again later.";
                    setMessages(prev => [...prev, {
                        id: Date.now(), sender: 'bot',
                        text: errMsg,
                        quickReplies: [{ label: '🏠 Main Menu', id: 'main_menu' }],
                        timestamp: new Date()
                    }]);
                }
            }
        }
    };

    const formatTime = (date) =>
        date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
            {/* ── Chat Window ── */}
            {isOpen && (
                <div className="bg-white w-[350px] sm:w-[400px] h-[540px] rounded-[2.5rem] shadow-2xl border border-gray-100 flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-5 duration-300">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-civic-500 to-civic-600 p-5 text-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                                <Bot className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-black text-base leading-tight">CityBot</h3>
                                <div className="flex items-center gap-1.5 opacity-80">
                                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">
                                        {cityName ? `Online · ${cityName}` : 'Online'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-white/10 rounded-xl transition-all active:scale-90"
                        >
                            <ChevronDown className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-grow p-4 overflow-y-auto bg-gray-50/50 space-y-4 scroll-smooth">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-gray-300">
                                <MessageCircle className="w-12 h-12 mb-3" />
                                <p className="text-sm font-bold">Opening chat...</p>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                <div className={`flex gap-2 max-w-[88%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {/* Avatar */}
                                    <div className={`w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center text-[11px] font-black border shadow-sm ${msg.sender === 'user' ? 'bg-civic-500 text-white border-civic-500' : 'bg-white text-civic-500 border-gray-100'}`}>
                                        {msg.sender === 'user' ? 'U' : 'C'}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {/* Bubble */}
                                        <div className={`px-4 py-3 rounded-[1.25rem] text-sm font-medium leading-relaxed ${
                                            msg.sender === 'user'
                                                ? 'bg-civic-500 text-white rounded-tr-none shadow-md shadow-civic-100'
                                                : 'bg-white text-gray-700 rounded-tl-none border border-gray-100 shadow-sm'
                                        }`}>
                                            {formatText(msg.text)}
                                        </div>

                                        {/* Place Cards */}
                                        {msg.placeCards?.length > 0 && (
                                            <div className="flex flex-col gap-2 mt-1">
                                                {msg.placeCards.map(place => (
                                                    <div
                                                        key={place.id}
                                                        className="bg-white border border-gray-100 rounded-2xl shadow-sm p-2.5 flex gap-3 items-center hover:shadow-md transition-shadow"
                                                    >
                                                        <img
                                                            src={place.image || `https://picsum.photos/seed/${encodeURIComponent(place.name)}/80/80`}
                                                            alt={place.name}
                                                            className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-gray-100"
                                                            onError={e => { e.target.onerror = null; e.target.src = `https://picsum.photos/seed/${encodeURIComponent(place.name)}/80/80`; }}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-sm text-gray-800 truncate leading-snug">{place.name}</p>
                                                            <p className="text-xs text-gray-400 capitalize mt-0.5">{place.type?.replace(/_/g, ' ')}</p>
                                                            <p className="text-xs text-amber-500 font-bold mt-0.5">
                                                                📍 {place.distance < 1 ? `${(place.distance * 1000).toFixed(0)}m` : `${place.distance.toFixed(1)} km away`}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => navigate('/explore')}
                                                            className="flex-shrink-0 text-xs text-white bg-amber-500 hover:bg-amber-600 font-bold px-2.5 py-1.5 rounded-xl transition-colors"
                                                        >
                                                            View →
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <span className={`text-[10px] text-gray-400 font-medium px-1 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                                            {formatTime(msg.timestamp)}
                                        </span>

                                        {/* Quick reply chips */}
                                        {msg.quickReplies?.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {msg.quickReplies.map((qr) => (
                                                    <button
                                                        key={qr.id}
                                                        onClick={() => handleQuickReply(qr.id)}
                                                        className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all hover:scale-105 active:scale-95 ${
                                                            qr.highlight
                                                                ? 'bg-civic-500 text-white border-civic-500 shadow-sm shadow-civic-200'
                                                                : 'bg-white text-gray-700 border-gray-200 hover:border-civic-300 hover:text-civic-500'
                                                        }`}
                                                    >
                                                        {qr.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {isTyping && (
                            <div className="flex justify-start animate-in fade-in duration-300">
                                <div className="flex gap-2">
                                    <div className="w-7 h-7 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-civic-500 text-[11px] font-black shadow-sm">C</div>
                                    <div className="bg-white border border-gray-100 rounded-[1.25rem] rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input - Only shown in Support Mode */}
                    {supportMode ? (
                        <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Describe your problem here..."
                                className="flex-grow bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-civic-200/20 transition-all placeholder:text-gray-400"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="w-11 h-11 bg-civic-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-civic-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </form>
                    ) : (
                        <div className="p-4 bg-white border-t border-gray-100 text-center">
                            <p className="text-xs font-semibold text-gray-400">Please choose an option above to continue.</p>
                        </div>
                    )}

                    <div className="text-center text-[9px] text-gray-300 font-bold pb-2 pt-1 uppercase tracking-widest bg-white">
                        City Sphere Assistant
                    </div>
                </div>
            )}

            {/* ── Floating trigger button ── */}
            <button
                onClick={() => isOpen ? setIsOpen(false) : openChat()}
                className={`w-16 h-16 rounded-[1.8rem] shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group relative overflow-hidden ${isOpen ? 'bg-white text-gray-400 border border-gray-100' : 'bg-gradient-to-br from-civic-400 to-civic-600 text-white'}`}
            >
                {!isOpen && (
                    <div className="absolute -top-12 right-0 bg-white text-gray-900 px-3 py-1.5 rounded-2xl shadow-xl text-[10px] font-black border border-gray-100 opacity-0 group-hover:opacity-100 transition-all transform group-hover:-translate-y-1 duration-300 whitespace-nowrap pointer-events-none uppercase tracking-wider">
                        City Guide 🏙️
                    </div>
                )}
                {isOpen ? <X className="w-7 h-7" /> : <MessageCircle className="w-7 h-7" />}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white text-[8px] font-black text-white flex items-center justify-center animate-pulse">
                        •
                    </span>
                )}
            </button>
        </div>
    );
};

export default ChatBot;
