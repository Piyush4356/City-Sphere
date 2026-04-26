import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { 
    MessageSquare, Star, Send, Clock, CheckCircle2, 
    AlertCircle, Info, ChevronRight, MapPin, 
    Trash2, ShieldAlert, Heart, BarChart3, 
    PlusCircle, History, Sparkles, LockKeyhole,
    Activity, Users, ArrowUpRight, Filter,
    ChevronDown, ChevronUp, X, ShieldCheck
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { ExploreContext } from '../context/ExploreContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FeedbackPage = () => {
    const { user } = useContext(AuthContext);
    const { cityName } = useContext(ExploreContext);
    
    const [activeTab, setActiveTab] = useState('feed'); // 'feed', 'give', 'history', 'experience', 'suggestions', 'status'
    const [cityFeed, setCityFeed] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [stats, setStats] = useState({ averageRating: 0, totalRatings: 0 });
    const [citySummary, setCitySummary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [expandedCard, setExpandedCard] = useState(null); // for Details expansion
    const [deletingId, setDeletingId] = useState(null);     // track in-progress deletes
    
    // Form States
    const [type, setType] = useState('complaint');
    const [category, setCategory] = useState('transport');
    const [content, setContent] = useState('');
    const [rating, setRating] = useState(5);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const CATEGORIES = [
        { id: 'transport', label: 'Transport', icon: '🚌' },
        { id: 'healthcare', label: 'Healthcare', icon: '🏥' },
        { id: 'waste', label: 'Waste Management', icon: '🗑️' },
        { id: 'water', label: 'Water Supply', icon: '🚰' },
        { id: 'infrastructure', label: 'Infrastructure', icon: '🏗️' },
        { id: 'other', label: 'Other', icon: '📁' }
    ];

    useEffect(() => {
        if (user) {
            fetchMyFeedback();
            if (cityName && cityName !== 'your city' && cityName !== 'Detecting Location...') {
                fetchCityStats();
                fetchCitySummary();
                fetchCityFeed();
            }
        }
    }, [user, cityName]);

    const fetchCityFeed = async () => {
        try {
            const { data } = await axios.get(`${API_URL}/api/feedback/city/${encodeURIComponent(cityName)}`);
            setCityFeed(data);
        } catch (err) {
            console.error('Error fetching city feed:', err);
        }
    };

    const fetchMyFeedback = async () => {
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.get(`${API_URL}/api/feedback/my`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFeedbacks(data);
        } catch (err) {
            console.error('Error fetching feedback:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCityStats = async () => {
        if (!cityName || cityName === 'your city') return;
        try {
            const { data } = await axios.get(`${API_URL}/api/feedback/stats/${encodeURIComponent(cityName)}`);
            setStats(data);
        } catch (err) {
            console.error('Error fetching city stats:', err);
        }
    };

    const fetchCitySummary = async () => {
        if (!cityName || cityName === 'your city') return;
        setSummaryLoading(true);
        try {
            const { data } = await axios.get(`${API_URL}/api/feedback/summary/${encodeURIComponent(cityName)}`);
            setCitySummary(data);
        } catch (err) {
            console.error('Error fetching city summary:', err);
        } finally {
            setSummaryLoading(false);
        }
    };

    const handleStar = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/api/feedback/star/${id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCityFeed();
        } catch (err) {
            console.error('Star error:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage({ text: '', type: '' });

        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.post(`${API_URL}/api/feedback/submit`, {
                type,
                category: type === 'experience' ? 'other' : category,
                content,
                rating: type === 'experience' ? rating : undefined,
                cityName
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const isExp = type === 'experience';
            setMessage({ 
                text: isExp 
                    ? 'Thank you for sharing your experience! It is now live.' 
                    : 'Report submitted! An email has been sent to you and our admins for verification. It will appear on your activity once approved.', 
                type: 'success' 
            });
            setContent('');
            fetchMyFeedback();
            fetchCityStats();
            fetchCitySummary();
            fetchCityFeed();
            if (isExp) {
                setTimeout(() => setActiveTab('experience'), 2000);
            } else {
                setTimeout(() => setActiveTab('history'), 2000);
            }
        } catch (err) {
            setMessage({ text: err.response?.data?.message || 'Failed to submit', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    // ── Delete own pending feedback ─────────────────────────────────────────
    const handleDeleteFeedback = async (id) => {
        if (!window.confirm('Delete this feedback? This cannot be undone.')) return;
        setDeletingId(id);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/feedback/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFeedbacks(prev => prev.filter(f => f._id !== id));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete feedback.');
        } finally {
            setDeletingId(null);
        }
    };

    // ── Admin: mark a feedback group as resolved ─────────────────────────────
    const handleAdminResolve = async (category) => {
        if (!window.confirm(`Mark all "${category}" issues in ${cityName} as resolved?`)) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/feedback/admin/resolve`, 
                { cityName, category },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchCitySummary();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to resolve issues.');
        }
    };

    const getStatusInfo = (status) => {
        switch (status) {
            case 'pending': return { label: 'Tracking Progress', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: <Clock className="w-3.5 h-3.5 mr-1.5" /> };
            case 'resolution': return { label: 'High Priority Action', color: 'text-civic-500', bg: 'bg-civic-50', border: 'border-civic-100', icon: <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />, pulse: true };
            case 'resolved': return { label: 'Completed', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> };
            default: return { label: status, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-100' };
        }
    };

    const filteredSummary = selectedCategory === 'all' 
        ? citySummary 
        : citySummary.filter(s => s.category === selectedCategory);

    if (!user) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-[32px] p-10 shadow-xl shadow-indigo-100/50 border border-indigo-50 text-center">
                    <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <LockKeyhole className="w-10 h-10 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-3">Login Required</h2>
                    <p className="text-gray-500 font-medium mb-8">Join the community to share your feedback and help improve {cityName}.</p>
                    <button onClick={() => window.location.href='/login'} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                        Sign In to City Sphere
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white pt-24 pb-20 px-6 sm:px-10">
            <div className="max-w-4xl mx-auto">
                
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <div>
                        <div className="inline-flex items-center space-x-2 bg-indigo-50 px-3 py-1 rounded-full mb-4">
                            <Sparkles className="w-4 h-4 text-indigo-600 fill-indigo-600" />
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">Citizen Voice</span>
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight leading-tight">Your City, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Your Improvements</span></h1>
                        <p className="text-gray-500 font-medium flex items-center">
                            <MapPin className="w-4 h-4 mr-2 text-indigo-400" /> Contributing to civic excellence in <b className="ml-1">{cityName}</b>
                        </p>
                    </div>

                    {stats.totalRatings >= 0 && (
                        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center space-x-4">
                            <div className="bg-amber-50 p-3 rounded-2xl">
                                <BarChart3 className="w-6 h-6 text-amber-500" />
                            </div>
                            <div>
                                <div className="flex items-center">
                                    <span className="text-2xl font-black text-gray-900 mr-1">{stats.totalRatings === 0 ? '--' : stats.averageRating?.toFixed(1)}</span>
                                    <Star className="w-4 h-4 text-amber-400 fill-amber-400 mb-1" />
                                </div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    {stats.totalRatings === 0 ? 'Be the first to rate' : 'Ease of Living Index'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* CONSOLIDATED TAB NAVIGATION */}
                <div className="flex justify-center mb-12">
                    <div className="bg-gray-100/50 p-1.5 rounded-[24px] flex w-full max-w-4xl shadow-inner overflow-x-auto no-scrollbar">
                        <button 
                            onClick={() => setActiveTab('feed')}
                            className={`flex-1 min-w-[120px] flex items-center justify-center py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'feed' ? 'bg-white shadow-xl text-indigo-600 scale-[1.02]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Activity className="w-3.5 h-3.5 mr-2" /> CITY FEED
                        </button>
                        <button 
                            onClick={() => { setActiveTab('give'); setMessage({ text: '', type: '' }); }}
                            className={`flex-1 min-w-[120px] flex items-center justify-center py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'give' ? 'bg-white shadow-xl text-indigo-600 scale-[1.02]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <PlusCircle className="w-3.5 h-3.5 mr-2" /> REPORT
                        </button>
                        <button 
                            onClick={() => { setActiveTab('history'); setMessage({ text: '', type: '' }); }}
                            className={`flex-1 min-w-[120px] flex items-center justify-center py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white shadow-xl text-indigo-600 scale-[1.02]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <History className="w-3.5 h-3.5 mr-2" /> MY ACTIVITY
                        </button>
                        <button 
                            onClick={() => setActiveTab('experience')}
                            className={`flex-1 min-w-[120px] flex items-center justify-center py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'experience' ? 'bg-white shadow-xl text-indigo-600 scale-[1.02]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Heart className="w-3.5 h-3.5 mr-2" /> EXPERIENCES
                        </button>
                        <button 
                            onClick={() => setActiveTab('suggestions')}
                            className={`flex-1 min-w-[120px] flex items-center justify-center py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'suggestions' ? 'bg-white shadow-xl text-indigo-600 scale-[1.02]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Sparkles className="w-3.5 h-3.5 mr-2" /> SUGGESTIONS
                        </button>
                        <button 
                            onClick={() => { setActiveTab('status'); fetchCitySummary(); }}
                            className={`flex-1 min-w-[120px] flex items-center justify-center py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'status' ? 'bg-white shadow-xl text-indigo-600 scale-[1.02]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <BarChart3 className="w-3.5 h-3.5 mr-2" /> PROBLEM STATUS
                        </button>
                    </div>
                </div>

                {/* ─── GIVE FEEDBACK ─── */}
                {activeTab === 'give' && (
                    <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-[0_20px_50px_rgba(79,70,229,0.08)] border border-indigo-50/50">
                        <div className="flex items-center space-x-6 mb-10 overflow-x-auto pb-2">
                            {[
                                { id: 'experience', label: 'Share Experience', icon: <Heart className="w-4 h-4" /> },
                                { id: 'complaint', label: 'Report a Problem', icon: <ShieldAlert className="w-4 h-4" /> },
                                { id: 'suggestion', label: 'Share Suggestion', icon: <Sparkles className="w-4 h-4" /> }
                            ].map(opt => (
                                <button 
                                    key={opt.id}
                                    onClick={() => { setType(opt.id); setMessage({ text: '', type: '' }); }}
                                    className={`flex-shrink-0 flex items-center px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${type === opt.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-200 hover:text-indigo-600'}`}
                                >
                                    <span className="mr-2">{opt.icon}</span> {opt.label}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {type === 'experience' ? (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <p className="text-gray-900 font-extrabold text-xl mb-4">Share your recent experience in {cityName}</p>
                                        <p className="text-gray-500 text-sm">Was it a visit to a park, a commute, or a community event? Let everyone know!</p>
                                    </div>
                                    <div className="flex justify-center gap-4 py-4">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button 
                                                key={star} 
                                                type="button"
                                                onClick={() => setRating(star)}
                                                className={`p-3 rounded-2xl transition-all ${rating >= star ? 'text-amber-400 bg-amber-50 border-amber-100' : 'text-gray-200 bg-gray-50 border-gray-100'} border`}
                                            >
                                                <Star className={`w-10 h-10 ${rating >= star ? 'fill-amber-400' : ''}`} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (type === 'complaint' || type === 'suggestion') ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => { setCategory(cat.id); setMessage({ text: '', type: '' }); }}
                                            className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center text-center group ${category === cat.id ? 'bg-indigo-50 border-indigo-600' : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'}`}
                                        >
                                            <span className="text-3xl mb-3 transform group-hover:scale-125 transition-transform">{cat.icon}</span>
                                            <span className={`text-xs font-bold leading-tight ${category === cat.id ? 'text-indigo-600' : 'text-gray-500'}`}>{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : null}

                            <div className="relative group">
                                <textarea 
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder={
                                        type === 'experience' ? "Describe your experience... What did you see or do?" :
                                        type === 'complaint' ? `What is wrong with ${category} management?` : 
                                        "Your innovative suggestion for the city..."
                                    }
                                    className="w-full bg-gray-50/50 border-2 border-transparent focus:border-indigo-100 rounded-[28px] p-6 text-gray-700 font-medium placeholder-gray-400 outline-none transition-all h-40 focus:bg-white focus:shadow-inner"
                                    required
                                />
                                <div className="absolute top-4 right-6 text-indigo-200 group-focus-within:text-indigo-500 transition-colors">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                            </div>

                            {message.text && (
                                <div className={`p-4 rounded-2xl flex items-center animate-in zoom-in-95 duration-200 border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-3" /> : <AlertCircle className="w-5 h-5 mr-3" />}
                                    <span className="text-sm font-bold">{message.text}</span>
                                </div>
                            )}

                            <div className="pt-2">
                                <button 
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black py-5 rounded-[24px] shadow-xl shadow-indigo-200 transition-all transform active:scale-[0.98] flex items-center justify-center space-x-3 text-lg disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {submitting ? <Clock className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                                    <span>{type === 'experience' ? 'Share Experience' : type === 'suggestion' ? 'Submit Suggestion' : 'Submit Report'}</span>
                                </button>
                                {type === 'complaint' && (
                                    <p className="mt-6 text-center text-[11px] font-bold text-gray-400 flex items-center justify-center opacity-70">
                                        <ShieldAlert className="w-3.5 h-3.5 mr-2 text-indigo-400" /> 
                                        Issues reported by 20+ citizens automatically gain priority resolution status.
                                    </p>
                                )}
                            </div>
                        </form>
                    </div>
                )}



                {activeTab === 'feed' && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center">
                            <Activity className="w-6 h-6 mr-3 text-indigo-500" /> Live from {cityName}
                        </h3>
                        {cityFeed.filter(f => f.type !== 'suggestion').length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-gray-200">
                                <p className="text-gray-400 font-bold">No public activity in this city yet.</p>
                            </div>
                        ) : (
                            cityFeed.filter(f => f.type !== 'suggestion').map(item => (
                                <div key={item._id} className={`bg-white rounded-[32px] border p-6 md:p-8 shadow-sm transition-all ${item.type === 'experience' ? 'border-l-4 border-l-red-500 border-gray-100' : 'border-gray-100'}`}>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${item.type === 'experience' ? 'bg-red-50 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                            {item.user?.dp ? <img src={item.user.dp} className="w-full h-full rounded-full object-cover" /> : item.user?.name?.[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900">{item.user?.name || 'Citizen'}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(item.createdAt).toLocaleDateString()}</p>
                                                {item.type === 'experience' && (
                                                    <div className="flex items-center">
                                                        {[1, 2, 3, 4, 5].map(star => (
                                                            <Star key={star} className={`w-2.5 h-2.5 ${item.rating >= star ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="ml-auto flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${item.type === 'experience' ? 'bg-red-50 text-red-500 border-red-100' : item.type === 'complaint' ? 'bg-indigo-50 text-indigo-500 border-indigo-100' : 'bg-purple-50 text-purple-500 border-purple-100'}`}>
                                                {item.type}
                                            </span>
                                            {item.type === 'complaint' && (
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${item.status === 'resolved' ? 'bg-green-50 text-green-500 border-green-100' : 'bg-amber-50 text-amber-500 border-amber-100'}`}>
                                                    {item.status}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <h4 className="font-extrabold text-gray-900 mb-2 capitalize">{item.type === 'experience' ? 'Citizen Experience' : `${item.category} Problem`}</h4>
                                    <p className={`text-gray-600 text-sm leading-relaxed ${item.type === 'experience' ? 'italic' : ''}`}>
                                        {item.type === 'experience' ? `"${item.content}"` : item.content}
                                    </p>
                                    
                                    {/* Admin Only Actions */}
                                    {user?.role === 'admin' && item.status !== 'resolved' && (
                                        <div className="mt-6 pt-4 border-t border-gray-50 flex justify-end">
                                            <button 
                                                onClick={() => handleAdminResolve(item.cityName, item.category)}
                                                className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all flex items-center gap-2"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Resolve Category
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="bg-gray-50 h-32 rounded-[32px] animate-pulse border border-gray-100" />)}
                            </div>
                        ) : feedbacks.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-gray-200">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <History className="w-8 h-8 text-gray-200" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-400 italic">Your submission history is empty</h3>
                                <button onClick={() => setActiveTab('give')} className="mt-4 text-indigo-600 font-bold text-sm hover:underline">Submit your first report now</button>
                            </div>
                        ) : (
                            feedbacks.map(item => {
                                const status = getStatusInfo(item.status);
                                const isExpanded = expandedCard === item._id;
                                const canDelete = item.status === 'pending';
                                return (
                                    <div key={item._id} className="bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 transition-all overflow-hidden">
                                        <div className="p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                            {/* Category Icon */}
                                            <div className={`w-16 h-16 rounded-[20px] flex items-center justify-center flex-shrink-0 ${item.type === 'complaint' ? 'bg-red-50 text-red-500' : item.type === 'suggestion' ? 'bg-indigo-50 text-indigo-500' : 'bg-amber-50 text-amber-500'}`}>
                                                <span className="text-2xl">{CATEGORIES.find(c => c.id === item.category)?.icon || '🏙️'}</span>
                                            </div>
                                            
                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <h4 className="text-lg font-extrabold text-gray-900 capitalize tracking-tight">{item.category} {item.type}</h4>
                                                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex items-center border ${status.bg} ${status.color} ${status.border} ${status.pulse ? 'animate-pulse' : ''}`}>
                                                        {status.icon} {status.label}
                                                    </div>
                                                </div>
                                                <p className="text-gray-500 text-sm font-medium line-clamp-2 leading-relaxed">
                                                    {item.content}
                                                </p>
                                                <div className="mt-3 flex items-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                                                    <span>{new Date(item.createdAt).toLocaleDateString(undefined, { day:'numeric', month:'long', year:'numeric'})}</span>
                                                </div>
                                            </div>

                                            {/* Right Actions */}
                                            <div className="flex flex-row sm:flex-col items-center gap-2">
                                                {item.type === 'ease_of_living' ? (
                                                    <div className="flex items-center text-amber-400 bg-amber-50/50 px-3 py-1 rounded-xl border border-amber-100">
                                                        <span className="text-lg font-black mr-1">{item.rating}</span>
                                                        <Star className="w-4 h-4 fill-amber-400" />
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setExpandedCard(isExpanded ? null : item._id)}
                                                        className="flex items-center text-indigo-600 font-black text-[10px] uppercase tracking-widest bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl transition-colors"
                                                    >
                                                        Details {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                                                    </button>
                                                )}

                                                {/* Delete button — only for pending items */}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDeleteFeedback(item._id)}
                                                        disabled={deletingId === item._id}
                                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                                                        title="Delete this report"
                                                    >
                                                        {deletingId === item._id 
                                                            ? <Clock className="w-4 h-4 animate-spin" />
                                                            : <Trash2 className="w-4 h-4" />
                                                        }
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expanded Details Panel */}
                                        {isExpanded && (
                                            <div className="border-t border-gray-50 mx-6 md:mx-8 pb-6 pt-5 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div className="bg-gray-50 rounded-2xl p-4">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Type</p>
                                                        <p className="text-sm font-bold text-gray-800 capitalize">{item.type}</p>
                                                    </div>
                                                    <div className="bg-gray-50 rounded-2xl p-4">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">City</p>
                                                        <p className="text-sm font-bold text-gray-800">{item.cityName}</p>
                                                    </div>
                                                    <div className={`rounded-2xl p-4 ${status.bg} border ${status.border}`}>
                                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${status.color}`}>Current Status</p>
                                                        <p className={`text-sm font-bold ${status.color} flex items-center`}>{status.icon}{status.label}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-4 bg-indigo-50/60 rounded-2xl p-4">
                                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Full Report</p>
                                                    <p className="text-sm font-medium text-gray-700 leading-relaxed">{item.content}</p>
                                                </div>
                                                {item.status === 'pending' && item.type === 'complaint' && (
                                                    <div className="mt-3 flex items-start gap-2 bg-amber-50 rounded-2xl p-3">
                                                        <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                                        <p className="text-xs font-bold text-amber-700">
                                                            Once 20 citizens report the same issue, it gets escalated to High Priority status automatically.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}


                {activeTab === 'experience' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center">
                            <Heart className="w-6 h-6 mr-3 text-red-500" /> Community Experiences
                        </h3>
                        {cityFeed.filter(f => f.type === 'experience').length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-gray-200">
                                <p className="text-gray-400 font-bold">No experiences shared by citizens in {cityName} yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {cityFeed.filter(f => f.type === 'experience').map(item => (
                                    <div key={item._id} className="bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:shadow-red-50/50 transition-all border-l-4 border-l-red-500">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-black text-xs">
                                                {item.user?.dp ? <img src={item.user.dp} className="w-full h-full rounded-full object-cover" /> : item.user?.name?.[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-900">{item.user?.name || 'Citizen'}</p>
                                                <div className="flex items-center">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <Star key={star} className={`w-3 h-3 ${item.rating >= star ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                                                    ))}
                                                    <span className="text-[10px] font-bold text-gray-400 ml-2 uppercase tracking-widest">{new Date(item.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-gray-600 text-sm leading-relaxed italic">"{item.content}"</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}


                {activeTab === 'suggestions' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-gray-900 flex items-center">
                                <Sparkles className="w-6 h-6 mr-3 text-amber-500" /> City Suggestions
                            </h3>
                            <div className="bg-amber-50 text-amber-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100">
                                Most Helpful First
                            </div>
                        </div>
                        {cityFeed.filter(f => f.type === 'suggestion').length === 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Mock Suggestions when empty */}
                                <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm relative group opacity-60">
                                    <div className="absolute top-6 right-6 flex items-center space-x-2 px-4 py-2 rounded-2xl bg-amber-500 text-white border border-amber-500">
                                        <Star className="w-4 h-4 fill-white" />
                                        <span className="text-xs font-black">12</span>
                                    </div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black">M</div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900">Mock User</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Featured Suggestion</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="bg-gray-50 rounded-2xl p-4">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Category</p>
                                            <p className="text-sm font-bold text-gray-700 capitalize">Transport</p>
                                        </div>
                                        <p className="text-gray-600 text-sm leading-relaxed font-medium">"We should implement a smart bicycle sharing system near the Clock Tower to reduce traffic congestion."</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                                    <Sparkles className="w-10 h-10 text-gray-200 mb-4" />
                                    <p className="text-gray-400 font-bold italic text-center">No real suggestions yet. Be the first!</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {cityFeed.filter(f => f.type === 'suggestion')
                                  .sort((a, b) => (b.starCount || 0) - (a.starCount || 0))
                                  .map(item => {
                                    const isStarred = item.stars?.includes(user?._id);
                                    return (
                                        <div key={item._id} className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm hover:shadow-xl transition-all relative group">
                                            <button 
                                                onClick={() => handleStar(item._id)}
                                                className={`absolute top-6 right-6 flex items-center space-x-2 px-4 py-2 rounded-2xl transition-all border ${isStarred ? 'bg-amber-500 border-amber-500 text-white' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-amber-200 hover:text-amber-500'}`}
                                            >
                                                <Star className={`w-4 h-4 ${isStarred ? 'fill-white' : ''}`} />
                                                <span className="text-xs font-black">{item.starCount || 0}</span>
                                            </button>

                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black">
                                                    {item.user?.dp ? <img src={item.user.dp} className="w-full h-full rounded-2xl object-cover" /> : item.user?.name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-gray-900">{item.user?.name || 'Citizen'}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Suggested {new Date(item.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="bg-gray-50 rounded-2xl p-4">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Category</p>
                                                    <p className="text-sm font-bold text-gray-700 capitalize">{item.category}</p>
                                                </div>
                                                <p className="text-gray-600 text-sm leading-relaxed font-medium">"{item.content}"</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}


                {/* ─── COMMUNITY TRACK STATUS ─── */}
                {activeTab === 'status' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* Category Filter Chips */}
                        <div className="flex items-center space-x-3 overflow-x-auto pb-4">
                            <button 
                                onClick={() => setSelectedCategory('all')}
                                className={`flex-shrink-0 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${selectedCategory === 'all' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200 hover:text-indigo-600'}`}
                            >
                                All Issues
                            </button>
                            {CATEGORIES.map(cat => (
                                <button 
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`flex-shrink-0 flex items-center space-x-2 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${selectedCategory === cat.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200 hover:text-indigo-600'}`}
                                >
                                    <span>{cat.icon}</span>
                                    <span>{cat.label}</span>
                                </button>
                            ))}
                        </div>

                        {summaryLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[1, 2, 3, 4].map(i => <div key={i} className="bg-gray-50 h-64 rounded-[40px] animate-pulse border border-gray-100" />)}
                            </div>
                        ) : filteredSummary.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-gray-200">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Activity className="w-8 h-8 text-gray-200" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-400 italic">No community reports for this category in {cityName}.</h3>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {filteredSummary.map((item) => {
                                    const status = getStatusInfo(item.status);
                                    const categoryInfo = CATEGORIES.find(c => c.id === item.category);
                                    const progress = item.status === 'pending' ? (item.count / 20) * 100 : 100;
                                    const isCardExpanded = expandedCard === `community_${item.category}_${item.status}`;
                                    
                                    return (
                                        <div 
                                            key={`${item.category}-${item.status}`} 
                                            className="group bg-white rounded-[40px] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/30 transition-all overflow-hidden"
                                        >
                                            <div className="p-8 relative">
                                                {/* Status badge top-right */}
                                                <div className="absolute top-0 right-0 p-6">
                                                    <div className={`p-3 rounded-2xl ${status.bg} ${status.color} border ${status.border} ${status.pulse ? 'animate-pulse' : ''}`}>
                                                        {status.icon}
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-4 mb-6">
                                                    <div className="w-14 h-14 bg-gray-50 rounded-[20px] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                                        {categoryInfo?.icon}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xl font-black text-gray-900 capitalize tracking-tight">{item.category} Issues</h4>
                                                        <p className={`text-[10px] font-black uppercase tracking-widest ${status.color}`}>{status.label}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <span className="text-2xl font-black text-gray-900">{item.count}</span>
                                                            <span className="text-xs font-bold text-gray-400 ml-2">Verified Reports</span>
                                                        </div>
                                                        {item.status === 'pending' ? (
                                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{Math.max(0, 20 - item.count)} more to escalate</p>
                                                        ) : (
                                                            <p className="text-[10px] font-black text-civic-400 uppercase tracking-widest mb-1 flex items-center">
                                                                <Users className="w-3 h-3 mr-1" /> Collective Action
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Progress Bar */}
                                                    <div className="h-4 bg-gray-50 rounded-full overflow-hidden border border-gray-100 p-1">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${item.status === 'pending' ? 'bg-amber-400' : item.status === 'resolution' ? 'bg-civic-500' : 'bg-emerald-500'}`}
                                                            style={{ width: `${Math.min(progress, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Footer with Details button */}
                                                <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                                                        Updated {new Date(item.lastUpdate).toLocaleDateString()}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        {/* Admin resolve button */}
                                                        {user?.role === 'admin' && item.status !== 'resolved' && (
                                                            <button
                                                                onClick={() => handleAdminResolve(item.category)}
                                                                className="flex items-center text-emerald-600 font-black text-[10px] uppercase tracking-widest bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl transition-colors"
                                                            >
                                                                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Resolve
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setExpandedCard(isCardExpanded ? null : `community_${item.category}_${item.status}`)}
                                                            className="flex items-center text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:translate-x-0.5 transition-transform"
                                                        >
                                                            Details {isCardExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ArrowUpRight className="w-3 h-3 ml-1" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expandable Latest Report Detail */}
                                            {isCardExpanded && (
                                                <div className="border-t border-gray-50 px-8 py-6 bg-gray-50/40 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Latest Report</p>
                                                    <p className="text-gray-700 font-medium text-sm italic leading-relaxed mb-4">
                                                        "{item.lastReport}"
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-white rounded-2xl p-3 border border-gray-100">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Category</p>
                                                            <p className="text-sm font-bold text-gray-700 capitalize">{item.category}</p>
                                                        </div>
                                                        <div className={`rounded-2xl p-3 border ${status.border} ${status.bg}`}>
                                                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${status.color}`}>Status</p>
                                                            <p className={`text-sm font-bold ${status.color} flex items-center`}>{status.icon}{status.label}</p>
                                                        </div>
                                                    </div>
                                                    {item.status === 'resolution' && (
                                                        <div className="mt-3 flex items-start gap-2 bg-civic-50 rounded-2xl p-3">
                                                            <ShieldAlert className="w-4 h-4 text-civic-400 flex-shrink-0 mt-0.5" />
                                                            <p className="text-xs font-bold text-civic-600">
                                                                This issue has been escalated to high priority and is under active review by city authorities.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* How it works banner */}
                        <div className="bg-indigo-50/50 rounded-[40px] p-8 mt-12 flex flex-col md:flex-row items-center gap-8 border border-indigo-100/50">
                            <div className="bg-white p-6 rounded-3xl shadow-sm">
                                <Users className="w-10 h-10 text-indigo-600" />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h4 className="text-xl font-black text-gray-900 mb-2">How this works?</h4>
                                <p className="text-gray-500 font-medium text-sm leading-relaxed">
                                    Once a specific category reaches <strong>20 community reports</strong>, the issue is automatically flagged as <strong>High Priority</strong> for city authorities. Your voice gains power through collective reporting.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeedbackPage;
