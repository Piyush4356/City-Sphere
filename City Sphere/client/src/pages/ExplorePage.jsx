import React, { useState, useContext, useMemo, useRef } from 'react';
import { ExploreContext } from '../context/ExploreContext';
import { Search, MapPin, Navigation, Bookmark, BookmarkCheck, ExternalLink, Star, Filter, RefreshCw, PlusCircle, X, Upload, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// ─── Skeleton Card ───────────────────────────────────────────
const SkeletonCard = () => (
    <div className="bg-white rounded-lg border border-border overflow-hidden">
        <div className="skeleton h-44 w-full" />
        <div className="p-4 space-y-3">
            <div className="skeleton h-5 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-5/6" />
            <div className="skeleton h-9 w-full mt-2" />
        </div>
    </div>
);

// ─── Type Badge Colors ───────────────────────────────────────
const BADGE_STYLES = {
    attraction: 'bg-gray-700 text-white',
    monument:   'bg-amber-700 text-white',
    fort:       'bg-stone-700 text-white',
    museum:     'bg-violet-700 text-white',
    park:       'bg-emerald-700 text-white',
    nature:     'bg-teal-700 text-white',
};

// ─── Suggest Place Modal ─────────────────────────────────────
const SuggestPlaceModal = ({ isOpen, onClose, userCoords, cityName }) => {
    const [formData, setFormData] = useState({
        name: '',
        type: 'attraction',
        description: '',
        lat: userCoords?.lat || '',
        lon: userCoords?.lon || '',
    });
    const [image, setImage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const fileInputRef = useRef(null);

    React.useEffect(() => {
        if (userCoords && !formData.lat) {
            setFormData((prev) => ({ ...prev, lat: userCoords.lat, lon: userCoords.lon }));
        }
    }, [userCoords]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMessage('');

        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('You must be logged in to suggest a place');

            const data = new FormData();
            data.append('name', formData.name);
            data.append('type', formData.type);
            data.append('cityName', cityName || 'Unknown');
            data.append('lat', formData.lat);
            data.append('lon', formData.lon);
            data.append('description', formData.description);
            if (image) data.append('image', image);

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const res = await axios.post(`${API_URL}/api/suggestions/submit`, data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });

            setSuccessMessage(res.data.message || 'Place submitted successfully!');
            setTimeout(() => {
                onClose();
                setSuccessMessage('');
                setFormData({ name: '', type: 'attraction', description: '', lat: userCoords?.lat || '', lon: userCoords?.lon || '' });
                setImage(null);
            }, 3000);
        } catch (err) {
            setErrorMessage(err.response?.data?.message || err.message || 'Failed to submit place');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="px-5 py-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <PlusCircle className="w-5 h-5 text-civic-500" /> Suggest a Place
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-md transition">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 overflow-y-auto">
                    {successMessage ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <CheckCircle className="w-12 h-12 text-green-600 mb-3" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">Submitted</h3>
                            <p className="text-sm text-gray-600">{successMessage}</p>
                            <p className="text-xs text-gray-400 mt-3">An admin will review your suggestion.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {errorMessage && (
                                <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">{errorMessage}</div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Place Name</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 rounded-md border border-border text-sm focus:ring-2 focus:ring-civic-200 focus:border-civic-500 outline-none transition"
                                    placeholder="E.g. Secret Waterfall"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-3 py-2 rounded-md border border-border text-sm focus:ring-2 focus:ring-civic-200 focus:border-civic-500 outline-none transition"
                                >
                                    <option value="attraction">Attraction</option>
                                    <option value="monument">Monument</option>
                                    <option value="fort">Fort</option>
                                    <option value="museum">Museum</option>
                                    <option value="park">Park</option>
                                    <option value="nature">Nature</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                                    <input
                                        required
                                        type="number"
                                        step="any"
                                        value={formData.lat}
                                        onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                                        className="w-full px-3 py-2 rounded-md border border-border text-sm focus:ring-2 focus:ring-civic-200 focus:border-civic-500 outline-none transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                                    <input
                                        required
                                        type="number"
                                        step="any"
                                        value={formData.lon}
                                        onChange={(e) => setFormData({ ...formData, lon: e.target.value })}
                                        className="w-full px-3 py-2 rounded-md border border-border text-sm focus:ring-2 focus:ring-civic-200 focus:border-civic-500 outline-none transition"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 -mt-2">Auto-filled with your current location.</p>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    required
                                    rows="3"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 rounded-md border border-border text-sm focus:ring-2 focus:ring-civic-200 focus:border-civic-500 outline-none transition resize-none"
                                    placeholder="Why should people visit this place?"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Photo (Optional)</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer hover:bg-gray-50 hover:border-civic-300 transition flex flex-col items-center"
                                >
                                    <Upload className="w-6 h-6 text-gray-400 mb-1.5" />
                                    <span className="text-xs font-medium text-gray-500">{image ? image.name : 'Click to upload (max 5MB)'}</span>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={(e) => setImage(e.target.files[0])}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-civic-500 hover:bg-civic-600 text-white font-medium py-2.5 px-4 rounded-md shadow-sm transition disabled:opacity-60 flex justify-center items-center text-sm"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Submitting...
                                    </span>
                                ) : (
                                    'Submit Suggestion'
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Place Card ──────────────────────────────────────────────
const PlaceCard = ({ spot, savedIds, toggleSave, onNavigate }) => {
    const badgeClass = BADGE_STYLES[spot.type] || BADGE_STYLES.attraction;

    return (
        <div className="bg-white rounded-lg border border-border overflow-hidden flex flex-col group hover:shadow-md transition-shadow duration-200">
            {/* Image */}
            <div className="h-44 overflow-hidden relative">
                <img
                    src={spot.image || `https://picsum.photos/seed/${spot.id}/500/350`}
                    alt={spot.name}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://picsum.photos/seed/${spot.name}/500/350`;
                    }}
                />
                {/* Type Badge */}
                <span className={`absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}>
                    {spot.type}
                </span>
                {/* Community Badge */}
                {spot.isCommunity && (
                    <span className="absolute bottom-2 left-auto right-2 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-civic-500 text-white">
                        Community
                    </span>
                )}
                {/* Save Button */}
                <button
                    onClick={() => toggleSave(spot)}
                    className="absolute top-2 right-2 p-1.5 bg-white rounded-md shadow-sm hover:shadow transition text-gray-600 hover:text-civic-500"
                    title={savedIds.has(spot.id) ? 'Remove from saved' : 'Save place'}
                >
                    {savedIds.has(spot.id) ? (
                        <BookmarkCheck className="w-4 h-4 text-civic-500 fill-current" />
                    ) : (
                        <Bookmark className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-grow">
                {/* Name + Rating */}
                <div className="flex justify-between items-start gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-civic-500 transition-colors">
                        {spot.name}
                    </h3>
                    <div className="flex items-center gap-0.5 text-amber-500 flex-shrink-0 bg-amber-50 px-1.5 py-0.5 rounded">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-xs font-semibold">{spot.rating.toFixed(1)}</span>
                    </div>
                </div>

                {/* Distance */}
                <div className="flex items-center text-gray-400 text-xs mb-2">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span className="font-medium">{spot.distance < 1 ? '<1 km' : `${spot.distance.toFixed(1)} km`}</span>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-4 flex-grow">
                    {spot.description || `A prominent ${spot.type} in ${spot.cityName || 'the city'}.`}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border">
                    <button
                        onClick={() => onNavigate(spot)}
                        className="flex-1 border border-civic-500 text-civic-500 hover:bg-civic-500 hover:text-white px-3 py-2 rounded-md font-medium transition text-xs flex items-center justify-center gap-1.5"
                    >
                        <Navigation className="w-3 h-3" /> Get Directions
                    </button>
                    {spot.website && (
                        <a
                            href={spot.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition border border-border"
                            title="View on Wikipedia"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Main Explore Page ───────────────────────────────────────
const ExplorePage = () => {
    const { userCoords, cityName, spots, loading, savedIds, toggleSave, setNavDestination, refreshPlaces } = useContext(ExploreContext);

    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleNavigate = (spot) => {
        setNavDestination({ lat: spot.lat, lon: spot.lon, name: spot.name });
        navigate('/map');
    };

    const categories = ['All', 'attraction', 'monument', 'fort', 'museum', 'park', 'nature'];

    const filteredSpots = useMemo(() => {
        return spots.filter((spot) => {
            const matchesSearch =
                spot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (spot.description && spot.description.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesFilter = activeFilter === 'All' || spot.type === activeFilter;
            return matchesSearch && matchesFilter;
        });
    }, [spots, searchTerm, activeFilter]);

    // ── Loading State — Skeleton Grid ─────────────────────────
    if (loading) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <div className="skeleton h-8 w-64 mb-2" />
                    <div className="skeleton h-4 w-96" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[...Array(6)].map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            </div>
        );
    }

    const displayCity = cityName ? cityName.charAt(0).toUpperCase() + cityName.slice(1) : 'Your City';

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 relative">
            <SuggestPlaceModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                userCoords={userCoords}
                cityName={cityName}
            />

            {/* ── Page Header ──────────────────────────────────── */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Explore {displayCity}</h1>
                <p className="text-sm text-gray-500 mb-5">Discover tourist attractions, historical monuments, parks, and local gems.</p>

                {/* Search + Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search places..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 rounded-md border border-border text-sm focus:ring-2 focus:ring-civic-200 focus:border-civic-500 outline-none transition bg-white"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={refreshPlaces}
                            className="px-4 py-2.5 rounded-md border border-border text-sm font-medium text-gray-600 hover:bg-gray-50 transition flex items-center gap-1.5 bg-white"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Refresh
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-4 py-2.5 rounded-md bg-civic-500 text-white text-sm font-medium hover:bg-civic-600 transition flex items-center gap-1.5 shadow-sm"
                        >
                            <PlusCircle className="w-3.5 h-3.5" /> Suggest Place
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Filter Bar ───────────────────────────────────── */}
            <div className="flex overflow-x-auto no-scrollbar gap-1.5 mb-6 pb-1">
                <div className="flex items-center text-gray-400 mr-1">
                    <Filter className="w-3.5 h-3.5 mr-1" />
                    <span className="text-xs font-medium whitespace-nowrap">Filter:</span>
                </div>
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveFilter(cat)}
                        className={`px-3 py-1.5 rounded-md whitespace-nowrap text-xs font-medium transition ${
                            activeFilter === cat
                                ? 'bg-civic-500 text-white'
                                : 'bg-white text-gray-600 border border-border hover:bg-gray-50'
                        }`}
                    >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                ))}
            </div>

            {/* ── Results Count ─────────────────────────────────── */}
            <p className="text-xs text-gray-400 mb-4 font-medium">
                {filteredSpots.length} {filteredSpots.length === 1 ? 'place' : 'places'} found
                {spots.length > filteredSpots.length && loading === false ? ` (${spots.length} total loaded)` : ''}
            </p>

            {/* ── Results Grid ─────────────────────────────────── */}
            {filteredSpots.length === 0 ? (
                <div className="bg-white rounded-lg p-12 text-center border border-border">
                    <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-gray-700">No places found</h3>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your search or selecting a different category.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredSpots.map((spot) => (
                        <PlaceCard
                            key={spot.id}
                            spot={spot}
                            savedIds={savedIds}
                            toggleSave={toggleSave}
                            onNavigate={handleNavigate}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ExplorePage;
