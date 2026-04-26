import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { 
    CheckCircle, XCircle, Clock, MapPin, 
    MessageSquare, User, Calendar, ExternalLink,
    AlertCircle, Loader2, ChevronRight, Image as ImageIcon,
    Navigation, Trash2
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { ExploreContext } from '../../context/ExploreContext';

const AdminReview = () => {
    const { user } = useContext(AuthContext);
    const { refreshPlaces } = useContext(ExploreContext);
    const [pending, setPending] = useState([]);
    const [pendingReports, setPendingReports] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('places'); // 'places', 'reports', or 'history'
    const [reviewingId, setReviewingId] = useState(null);
    const [statusAction, setStatusAction] = useState(null); 
    const [note, setNote] = useState('');
    const [message, setMessage] = useState(null);
    const [brokenImages, setBrokenImages] = useState({});

    const handleImageError = (id) => {
        setBrokenImages(prev => ({ ...prev, [id]: true }));
    };

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        fetchPending();
        fetchPendingReports();
        fetchHistory();
    }, []);

    const fetchPendingReports = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/feedback/admin/pending`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingReports(res.data);
        } catch (err) {
            console.error('Fetch pending reports error:', err);
        }
    };

    const fetchPending = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/suggestions/admin/pending`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPending(res.data);
        } catch (err) {
            console.error('Fetch pending error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/suggestions/admin/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data);
        } catch (err) {
            console.error('Fetch history error:', err);
        }
    };

    const handleVerifyReport = async (id) => {
        setReviewingId(id);
        setStatusAction('verifying');
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/feedback/admin/verify/${id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setMessage({ text: `Report verified and user notified!`, type: 'success' });
            setPendingReports(prev => prev.filter(p => p._id !== id));
        } catch (err) {
            setMessage({ text: 'Verification failed.', type: 'error' });
        } finally {
            setReviewingId(null);
            setStatusAction(null);
        }
    };

    const handleReview = async (id, status) => {
        setReviewingId(id);
        setStatusAction(status);
        setMessage(null);
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/api/suggestions/admin/review/${id}`, {
                status,
                adminNote: note
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setMessage({ text: `Suggestion ${status} successfully!`, type: 'success' });
            setPending(prev => prev.filter(p => p._id !== id));
            fetchHistory(); // Refresh history
            refreshPlaces(); // Update live app data
            setNote('');
        } catch (err) {
            setMessage({ text: 'Action failed. Please try again.', type: 'error' });
        } finally {
            setReviewingId(null);
            setStatusAction(null);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure? This will permanently remove this suggestion and its image.")) return;
        
        setReviewingId(id);
        setStatusAction('deleting');
        setMessage(null);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/suggestions/admin/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setMessage({ text: 'Suggestion deleted forever.', type: 'success' });
            setPending(prev => prev.filter(p => p._id !== id));
            setHistory(prev => prev.filter(p => p._id !== id));
            refreshPlaces(); // Update live app data
        } catch (err) {
            setMessage({ text: 'Delete failed. Please try again.', type: 'error' });
        } finally {
            setReviewingId(null);
            setStatusAction(null);
        }
    };

    if (user?.role !== 'admin') {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
                <div className="bg-red-50 p-6 rounded-3xl mb-4">
                    <AlertCircle className="w-12 h-12 text-red-500" />
                </div>
                <h2 className="text-2xl font-black text-gray-900">Access Denied</h2>
                <p className="text-gray-500 mt-2">Only administrators can access this moderation panel.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">City Moderation</h1>
                    <p className="text-gray-500 font-medium mt-1">Review and manage place suggestions from the community</p>
                </div>
                <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit">
                    <button 
                        onClick={() => setActiveSection('places')}
                        className={`px-8 py-3 rounded-xl text-xs font-black transition-all duration-200 ${activeSection === 'places' ? 'bg-white text-gray-900 shadow-lg' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        PLACES ({pending.length})
                    </button>
                    <button 
                        onClick={() => setActiveSection('reports')}
                        className={`px-8 py-3 rounded-xl text-xs font-black transition-all duration-200 ${activeSection === 'reports' ? 'bg-white text-gray-900 shadow-lg' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        REPORTS ({pendingReports.length})
                    </button>
                    <button 
                        onClick={() => setActiveSection('history')}
                        className={`px-8 py-3 rounded-xl text-xs font-black transition-all duration-200 ${activeSection === 'history' ? 'bg-white text-gray-900 shadow-lg' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        HISTORY ({history.length})
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-12 h-12 text-civic-400 animate-spin mb-4" />
                    <p className="text-gray-400 font-bold">Loading data...</p>
                </div>
            ) : activeSection === 'reports' ? (
                /* Reports Section */
                pendingReports.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-20 text-center border border-gray-100 shadow-sm">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-2xl font-black text-gray-900">No Pending Reports</h3>
                        <p className="text-gray-400 mt-2 font-medium">All citizen reports have been verified.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {pendingReports.map(report => (
                            <div key={report._id} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                                            <AlertCircle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-gray-900 text-lg uppercase tracking-tight">{report.category}</h4>
                                            <p className="text-xs font-bold text-gray-400">Submitted by {report.user?.name || 'Citizen'}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-widest">Pending Verification</span>
                                </div>
                                <p className="text-gray-600 font-medium mb-8 leading-relaxed italic">"{report.content}"</p>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => handleVerifyReport(report._id)}
                                        disabled={!!statusAction}
                                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        {reviewingId === report._id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                        Verify & Show Publicly
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : activeSection === 'places' ? (
                pending.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-20 text-center border border-gray-100 shadow-sm">
                        <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900">Queue is Clear!</h3>
                        <p className="text-gray-400 mt-2 font-medium">All student and citizen suggestions have been reviewed.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {pending.map(item => (
                        <div key={item._id} className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col lg:flex-row">
                                {/* Left: Image */}
                                <div className="lg:w-80 h-60 lg:h-auto relative bg-gray-100 flex-shrink-0">
                                    {item.imageUrl && !brokenImages[item._id] ? (
                                        <img 
                                            src={item.imageUrl} 
                                            className="w-full h-full object-cover" 
                                            alt={item.name} 
                                            onError={() => handleImageError(item._id)}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                            <ImageIcon className="w-12 h-12 mb-2" />
                                            <span className="text-xs font-bold">No Image Available</span>
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4">
                                        <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                                            {item.type}
                                        </span>
                                    </div>
                                </div>

                                {/* Right: Info */}
                                <div className="flex-grow p-8">
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                                        <div>
                                            <div className="flex items-center gap-2 text-civic-500 font-bold text-xs uppercase tracking-wider mb-1">
                                                <MapPin className="w-3.5 h-3.5" />
                                                <span>{item.cityName}</span>
                                            </div>
                                            <h2 className="text-2xl font-black text-gray-900">{item.name}</h2>
                                        </div>
                                        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-100">
                                            <div className="w-8 h-8 rounded-full bg-civic-100 flex items-center justify-center text-civic-500">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Submitted By</p>
                                                <p className="text-xs font-black text-gray-700 mt-0.5">{item.submittedBy?.name || 'Unknown'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center">
                                                <MessageSquare className="w-3.5 h-3.5 mr-2" /> Description
                                            </h4>
                                            <p className="text-gray-600 text-sm leading-relaxed italic">
                                                "{item.description || 'No description provided by user.'}"
                                            </p>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                                    <Navigation className="w-3.5 h-3.5 mr-2" /> Coordinates
                                                </h4>
                                                <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                                                    <span>Lat: {item.lat.toFixed(4)}</span>
                                                    <span>Lon: {item.lon.toFixed(4)}</span>
                                                </div>
                                            </div>
                                            <a 
                                                href={`https://www.google.com/maps?q=${item.lat},${item.lon}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-civic-200 text-civic-500 text-xs font-bold hover:bg-civic-50 transition-colors"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" /> Verify on Google Maps
                                            </a>
                                        </div>
                                    </div>

                                    {/* Action Area */}
                                    <div className="border-t border-gray-100 pt-8 mt-4">
                                        <div className="flex flex-col space-y-4">
                                            <textarea 
                                                placeholder="Add a note (e.g. reason for rejection or special approval note)..."
                                                value={reviewingId === item._id ? note : ''}
                                                onChange={e => {
                                                    setReviewingId(item._id);
                                                    setNote(e.target.value);
                                                }}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:border-civic-400 focus:ring-4 focus:ring-civic-200/10 transition-all h-20 resize-none"
                                            />
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <button 
                                                    onClick={() => handleReview(item._id, 'approved')}
                                                    disabled={!!statusAction}
                                                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-green-200 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    {reviewingId === item._id && statusAction === 'approved' ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                                    Approve & Publish
                                                </button>
                                                <button 
                                                    onClick={() => handleReview(item._id, 'rejected')}
                                                    disabled={!!statusAction}
                                                    className="flex-1 bg-white hover:bg-red-50 text-red-500 border-2 border-red-100 font-black py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    {reviewingId === item._id && statusAction === 'rejected' ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                                                    Reject Suggestion
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(item._id)}
                                                    disabled={!!statusAction}
                                                    className="sm:w-16 bg-gray-100 hover:bg-red-500 hover:text-white text-gray-400 font-black py-4 rounded-2xl transition-all flex items-center justify-center disabled:opacity-50"
                                                    title="Delete Permanently"
                                                >
                                                    {reviewingId === item._id && statusAction === 'deleting' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
              )
            ) : (
                <div className="space-y-6">
                    {history.length === 0 ? (
                        <div className="bg-white rounded-[2.5rem] p-20 text-center border border-gray-100 shadow-sm">
                            <Clock className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <h3 className="text-2xl font-black text-gray-900">History is Empty</h3>
                            <p className="text-gray-400 mt-2 font-medium">No approved or rejected suggestions yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {history.map(item => (
                                <div key={item._id} className="bg-white rounded-3xl p-6 border border-gray-100 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100 shadow-inner">
                                            {item.imageUrl && !brokenImages[item._id] ? (
                                                <img 
                                                    src={item.imageUrl} 
                                                    className="w-full h-full object-cover" 
                                                    alt="" 
                                                    onError={() => handleImageError(item._id)}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                    <ImageIcon className="w-8 h-8" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-gray-900 text-lg leading-tight">{item.name}</h4>
                                            <div className="flex flex-wrap items-center gap-3 mt-2">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${item.status === 'approved' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                    {item.status}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                                                    <User className="w-3 h-3" />
                                                    {item.submittedBy?.name || 'Citizen'}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                                                    <MapPin className="w-3 h-3" />
                                                    {item.cityName}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 pl-6">
                                        <button 
                                            onClick={() => handleDelete(item._id)}
                                            disabled={!!statusAction}
                                            className="w-12 h-12 bg-gray-50 hover:bg-red-600 hover:text-white text-gray-400 rounded-2xl transition-all duration-300 flex items-center justify-center disabled:opacity-50 shadow-sm hover:shadow-red-200"
                                            title="Delete Permanently"
                                        >
                                            {reviewingId === item._id && statusAction === 'deleting' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            {message && (
                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl font-black text-white z-[200] animate-in slide-in-from-bottom-5 duration-300 ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {message.text}
                </div>
            )}
        </div>
    );
};

export default AdminReview;
