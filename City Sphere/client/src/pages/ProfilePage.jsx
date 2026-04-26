import React, { useState, useContext, useEffect, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ExploreContext } from '../context/ExploreContext';
import { User as UserIcon, Mail, Phone, Edit2, Save, X, BookmarkCheck, Camera, Key, Clock, MessageSquare, Loader2, Award, TrendingUp, FileText, Shield, Calendar, Upload, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Engagement Level Calculator ─────────────────────────────
const getEngagementLevel = (stats) => {
    const score = stats.feedbackCount * 10 + stats.savedCount * 5;
    if (score >= 100) return { level: 'Champion', color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', progress: 100, icon: '🏆' };
    if (score >= 50) return { level: 'Advocate', color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', progress: Math.min(100, (score / 100) * 100), icon: '⭐' };
    if (score >= 20) return { level: 'Contributor', color: 'text-civic-500', bg: 'bg-civic-50', border: 'border-civic-200', progress: Math.min(100, (score / 50) * 100), icon: '🌱' };
    return { level: 'Explorer', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', progress: Math.min(100, (score / 20) * 100), icon: '👋' };
};

const Profile = () => {
    const { user, login } = useContext(AuthContext);
    const { savedIds, spots } = useContext(ExploreContext);
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', dp: '', bio: '' });
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [savedPlacesData, setSavedPlacesData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '' });
    const [pwdLoading, setPwdLoading] = useState(false);
    const [activities, setActivities] = useState([]);
    const [activitiesLoading, setActivitiesLoading] = useState(true);
    const [isDragging, setIsDragging] = useState(false);

    // Sync form data from user context
    useEffect(() => {
        if (user && !isEditing) {
            setFormData({ name: user.name || '', phone: user.phone || '', dp: user.dp || '', bio: user.bio || '' });
            setAvatarPreview(null);
        }
    }, [user, isEditing]);

    // Filter saved spots
    useEffect(() => {
        if (spots.length > 0) setSavedPlacesData(spots.filter(s => savedIds.has(s.id)));
    }, [savedIds, spots]);

    // Fetch activities
    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const token = localStorage.getItem('token');
                const { data } = await axios.get(`${API_URL}/api/feedback/my`, { headers: { Authorization: `Bearer ${token}` } });
                const feedbackItems = data.map(f => ({ id: f._id, type: 'feedback', title: `Reported ${f.category}`, description: f.content, date: new Date(f.createdAt), status: f.status }));
                const savedItems = savedPlacesData.map(s => ({ id: s.id, type: 'bookmark', title: `Bookmarked ${s.name}`, description: `Added ${s.name} to favorites`, date: new Date(s.savedAt || Date.now()) }));
                setActivities([...feedbackItems, ...savedItems].sort((a, b) => b.date - a.date));
            } catch (err) { console.error("Failed to fetch activities:", err); }
            finally { setActivitiesLoading(false); }
        };
        if (user) fetchActivities();
    }, [user, savedPlacesData]);

    // ─── Avatar Handlers ─────────────────────────────────────
    const processFile = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) return setMessage({ text: 'Please select an image file (JPG, PNG, WebP)', type: 'error' });
        if (file.size > 2 * 1024 * 1024) return setMessage({ text: 'Image must be under 2MB', type: 'error' });

        const reader = new FileReader();
        reader.onload = (e) => {
            // Resize on a canvas before storing
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX = 400;
                let w = img.width, h = img.height;
                if (w > h) { h = (h / w) * MAX; w = MAX; } else { w = (w / h) * MAX; h = MAX; }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                const dataUrl = canvas.toDataURL('image/webp', 0.8);
                setAvatarPreview(dataUrl);
                setFormData(prev => ({ ...prev, dp: dataUrl }));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        setMessage({ text: '', type: '' });
    };

    const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files[0]); };
    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const removeAvatar = () => { setAvatarPreview(null); setFormData(prev => ({ ...prev, dp: '' })); };

    // ─── Form Handlers ───────────────────────────────────────
    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.put(`${API_URL}/api/auth/profile`, formData, { headers: { Authorization: `Bearer ${token}` } });
            login({ ...data, token });
            setMessage({ text: 'Profile updated successfully!', type: 'success' });
            setIsEditing(false);
        } catch (err) {
            setMessage({ text: err.response?.data?.message || 'Failed to update profile', type: 'error' });
        } finally { setLoading(false); setTimeout(() => setMessage({ text: '', type: '' }), 3000); }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPwdLoading(true);
        setMessage({ text: '', type: '' });
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/auth/change-password`, passwordData, { headers: { Authorization: `Bearer ${token}` } });
            setMessage({ text: 'Password changed successfully!', type: 'success' });
            setPasswordData({ currentPassword: '', newPassword: '' });
            setIsChangingPassword(false);
        } catch (err) {
            setMessage({ text: err.response?.data?.message || 'Failed to change password', type: 'error' });
        } finally { setPwdLoading(false); setTimeout(() => setMessage({ text: '', type: '' }), 4000); }
    };

    if (!user) return null;

    const stats = { feedbackCount: activities.filter(a => a.type === 'feedback').length, savedCount: savedPlacesData.length };
    const engagement = getEngagementLevel(stats);
    const memberSince = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'Recently';
    const currentAvatar = avatarPreview || formData.dp;

    return (
        <div className="max-w-5xl mx-auto py-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-8 flex items-center">
                <UserIcon className="w-8 h-8 mr-3 text-civic-500" /> My Profile
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* ─── Left: Profile Card ───────────────────────── */}
                <div className="col-span-1 space-y-6">
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col items-center">
                        {/* Avatar */}
                        <div className="relative mb-5 group">
                            {currentAvatar ? (
                                <img src={currentAvatar} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-civic-50 shadow-md" />
                            ) : (
                                <div className="w-32 h-32 rounded-full bg-civic-100 flex items-center justify-center border-4 border-civic-50 shadow-md">
                                    <UserIcon className="w-16 h-16 text-civic-500" />
                                </div>
                            )}
                            {isEditing && (
                                <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                                    <Camera className="w-8 h-8 text-white" />
                                </button>
                            )}
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mb-1">{user.name}</h2>
                        {user.bio && <p className="text-sm text-gray-500 text-center mb-2 italic max-w-[200px]">"{user.bio}"</p>}
                        <span className="bg-civic-50 text-civic-500 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-2">{user.role}</span>

                        {/* Member Since */}
                        <div className="flex items-center text-xs text-gray-400 mb-5">
                            <Calendar className="w-3.5 h-3.5 mr-1" /> Member since {memberSince}
                        </div>

                        <div className="w-full space-y-4 mb-6">
                            <div className="flex items-center text-gray-600"><Mail className="w-5 h-5 mr-3 text-gray-400" /><span className="text-sm font-medium truncate">{user.email}</span></div>
                            <div className="flex items-center text-gray-600"><Phone className="w-5 h-5 mr-3 text-gray-400" /><span className="text-sm font-medium">{user.phone || 'Not provided'}</span></div>
                        </div>

                        {!isEditing && !isChangingPassword && (
                            <div className="w-full space-y-3">
                                <button onClick={() => { setIsEditing(true); setIsChangingPassword(false); }} className="w-full py-3 bg-civic-500 hover:bg-civic-600 text-white font-bold rounded-xl transition flex items-center justify-center shadow-md shadow-civic-100"><Edit2 className="w-4 h-4 mr-2" /> Edit Profile</button>
                                <button onClick={() => { setIsChangingPassword(true); setIsEditing(false); }} className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl transition flex items-center justify-center border border-gray-200"><Key className="w-4 h-4 mr-2" /> Change Password</button>
                            </div>
                        )}
                    </div>

                    {/* ─── Engagement Card ──────────────────────── */}
                    <div className={`rounded-2xl p-5 border ${engagement.border} ${engagement.bg}`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">{engagement.icon}</span>
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Civic Level</p>
                                    <p className={`text-lg font-extrabold ${engagement.color}`}>{engagement.level}</p>
                                </div>
                            </div>
                            <Award className={`w-6 h-6 ${engagement.color}`} />
                        </div>
                        <div className="w-full bg-white/60 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-civic-500 rounded-full transition-all duration-700" style={{ width: `${engagement.progress}%` }} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <div className="text-center"><p className="text-xl font-extrabold text-gray-900">{stats.feedbackCount}</p><p className="text-[10px] text-gray-400 font-bold uppercase">Reports</p></div>
                            <div className="text-center"><p className="text-xl font-extrabold text-gray-900">{stats.savedCount}</p><p className="text-[10px] text-gray-400 font-bold uppercase">Bookmarks</p></div>
                        </div>
                    </div>
                </div>

                {/* ─── Right: Main Content ──────────────────────── */}
                <div className="col-span-1 md:col-span-2 space-y-8">
                    {isEditing ? (
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Edit Details</h3>
                                <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 p-2 bg-gray-50 rounded-full"><X className="w-5 h-5" /></button>
                            </div>

                            {message.text && (<div className={`p-4 mb-6 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>{message.text}</div>)}

                            <form onSubmit={handleUpdate} className="space-y-5">
                                {/* Avatar Upload Zone */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Profile Picture</label>
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => processFile(e.target.files[0])} />
                                    <div
                                        onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                                        className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${isDragging ? 'border-civic-400 bg-civic-50' : 'border-gray-200 hover:border-civic-300 hover:bg-gray-50'}`}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {currentAvatar ? (
                                            <div className="flex items-center gap-4">
                                                <img src={currentAvatar} alt="Preview" className="w-20 h-20 rounded-xl object-cover border-2 border-gray-100" />
                                                <div className="text-left flex-1">
                                                    <p className="text-sm font-bold text-gray-700">Photo selected</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">Click to change or drag a new image</p>
                                                </div>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); removeAvatar(); }} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ) : (
                                            <div className="py-4">
                                                <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                                <p className="text-sm font-medium text-gray-500">Drag & drop your photo here</p>
                                                <p className="text-xs text-gray-400 mt-1">or click to browse · JPG, PNG, WebP · Max 2MB</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Full Name</label>
                                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-civic-200 outline-none transition" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Phone Number</label>
                                    <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-civic-200 outline-none transition" placeholder="+91 9876543210" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Bio <span className="text-gray-400 font-normal">({formData.bio.length}/200)</span></label>
                                    <textarea value={formData.bio} onChange={e => { if (e.target.value.length <= 200) setFormData({...formData, bio: e.target.value}); }} rows={3} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-civic-200 outline-none transition resize-none" placeholder="A few words about yourself..." />
                                </div>

                                <button type="submit" disabled={loading} className="w-full mt-4 bg-civic-500 hover:bg-civic-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex justify-center items-center">
                                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                                    Save Changes
                                </button>
                            </form>
                        </div>
                    ) : isChangingPassword ? (
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center"><Shield className="w-5 h-5 mr-2 text-gray-400" /> Security Settings</h3>
                                <button onClick={() => setIsChangingPassword(false)} className="text-gray-400 hover:text-gray-600 p-2 bg-gray-50 rounded-full"><X className="w-5 h-5" /></button>
                            </div>
                            {message.text && (<div className={`p-4 mb-6 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>{message.text}</div>)}
                            <form onSubmit={handlePasswordChange} className="space-y-5">
                                <div><label className="block text-sm font-bold text-gray-700 mb-1.5">Current Password</label><input type="password" value={passwordData.currentPassword} onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-civic-200 outline-none transition" required /></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-1.5">New Password</label><input type="password" value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-civic-200 outline-none transition" required minLength="6" /></div>
                                <button type="submit" disabled={pwdLoading} className="w-full mt-4 bg-gray-900 hover:bg-black text-white font-bold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-70 flex justify-center items-center">
                                    {pwdLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> : <Key className="w-5 h-5 mr-2" />} Update Password
                                </button>
                            </form>
                        </div>
                    ) : (
                        <>
                            {/* Saved Places */}
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center"><BookmarkCheck className="w-6 h-6 mr-2 text-amber-600" /> Bookmarked Places</h3>
                                {savedPlacesData.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
                                        <BookmarkCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <h4 className="text-gray-500 font-medium">No places saved yet.</h4>
                                        <button onClick={() => navigate('/explore')} className="mt-4 text-amber-600 font-bold text-sm hover:underline">Explore the city</button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {savedPlacesData.map(spot => (
                                            <div key={spot.id} onClick={() => navigate('/explore')} className="border border-gray-100 rounded-2xl p-4 flex items-center cursor-pointer hover:shadow-md transition bg-gray-50/50 hover:bg-white group">
                                                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 mr-4"><img src={spot.image || `https://picsum.photos/seed/${spot.id}/100/100`} alt={spot.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" /></div>
                                                <div className="flex-1 min-w-0"><h4 className="font-bold text-gray-900 text-sm truncate">{spot.name}</h4><p className="text-xs text-gray-500 capitalize font-medium">{spot.type}</p></div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* My Submissions */}
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center"><Clock className="w-6 h-6 mr-2 text-civic-500" /> My Submissions</h3>
                                {activitiesLoading ? (
                                    <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-civic-500" /></div>
                                ) : activities.filter(a => a.type === 'feedback').length === 0 ? (
                                    <p className="text-center py-8 text-gray-400 font-medium italic">No reports found.</p>
                                ) : (
                                    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                                        {activities.filter(a => a.type === 'feedback').map((item, idx) => (
                                            <div key={item.id || idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-gray-50 group-[.is-active]:bg-white text-gray-400 group-[.is-active]:text-civic-500 shadow-sm z-10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-colors">
                                                    <MessageSquare className="w-4 h-4" />
                                                </div>
                                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group-hover:border-civic-100">
                                                    <div className="flex items-center justify-between space-x-2 mb-1">
                                                        <div className="font-bold text-gray-900">{item.title}</div>
                                                        <time className="text-xs font-bold text-civic-500 uppercase tracking-tighter">{item.date.toLocaleDateString()}</time>
                                                    </div>
                                                    <div className="text-gray-500 text-sm line-clamp-1">{item.description}</div>
                                                    {item.status && (
                                                        <div className="mt-2 flex items-center">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${item.status === 'resolved' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>{item.status}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
