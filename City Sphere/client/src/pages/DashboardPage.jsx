import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Loader2, Cloud, Droplets, MapPin, Wind, Thermometer, CalendarClock, Landmark, Star, ChevronRight, Compass, AlertTriangle, Zap, Navigation, TrendingUp, Users, CheckCircle, BarChart3, PartyPopper, Sparkles } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { ExploreContext } from '../context/ExploreContext';

// --- In-Memory Cache to prevent refetching during navigation ---
let dashCache = {
    weather: null,
    cityName: 'Detecting Location...',
    userCoords: null,
    spots: [],
    hasWeather: false,
    hasSpots: false,
    spotsCity: null,
    locationError: null
};

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    
    // --- Weather Widget State ---
    const [weather, setWeather] = useState(dashCache.weather);
    const [cityName, setCityName] = useState(dashCache.cityName);
    const [loadingWeather, setLoadingWeather] = useState(!dashCache.hasWeather);

    // --- City Service State ---
    const [schedule, setSchedule] = useState(null);
    const [scheduleLoading, setScheduleLoading] = useState(true);

    // --- City Explorer State ---
    const { spots, loading: loadingSpots } = useContext(ExploreContext);

    // --- City Feedback State ---
    const [citySummary, setCitySummary] = useState([]);
    const [topSuggestions, setTopSuggestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(true);

    // --- AQI State ---
    const [aqi, setAqi] = useState(null);

    // --- City Insights State ---
    const [nextHoliday, setNextHoliday] = useState(null);

    // --- Weather Fetching Logic ---
    useEffect(() => {
        if (dashCache.hasWeather) {
            if (dashCache.locationError) {
                setCityName(dashCache.locationError);
                setLoadingWeather(false);
            }
            return;
        }

        // Step 1: Get User Location for Weather
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    
                    try {
                        // First, reverse geocode to get city name (no API key needed)
                        const geoRes = await axios.get(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
                        );
                        const city = geoRes.data.address.city || geoRes.data.address.town || 'New Delhi';
                        
                        setCityName(city);
                        dashCache.cityName = city;

                        // Save coords
                        dashCache.userCoords = { lat, lon };

                        // Fetch AQI in parallel (no API key, Open-Meteo)
                        axios.get(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm10,pm2_5`)
                            .then(r => setAqi(r.data.current))
                            .catch(() => {});

                        // Second, fetch weather
                        const weatherRes = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relative_humidity_2m`);
                        
                        const weatherData = {
                            temp: weatherRes.data.current_weather.temperature,
                            condition: weatherRes.data.current_weather.weathercode, // Needs mapping to string
                            wind: weatherRes.data.current_weather.windspeed,
                            humidity: weatherRes.data.hourly.relative_humidity_2m[0]
                        };
                        
                        setWeather(weatherData);
                        dashCache.weather = weatherData;
                        dashCache.hasWeather = true;
                        
                    } catch (err) {
                        console.error("Weather fetch failed", err);
                        const errStr = "Location Error";
                        setCityName(errStr);
                        dashCache.locationError = errStr;
                        dashCache.hasWeather = true;
                    }
                    setLoadingWeather(false);
                },
                () => {
                    const errStr = "Location Access Denied";
                    setCityName(errStr);
                    dashCache.locationError = errStr;
                    dashCache.hasWeather = true;
                    setLoadingWeather(false);
                }
            );
        } else {
            const errStr = "Geolocation Unsupported";
            setCityName(errStr);
            dashCache.locationError = errStr;
            dashCache.hasWeather = true;
            setLoadingWeather(false);
        }
    }, []);



    useEffect(() => {
        if (!cityName || cityName === 'Detecting Location...' || cityName === 'Location Access Denied') return;

        const fetchScheduleAndFeedback = async () => {
            setScheduleLoading(true);
            setLoadingSuggestions(true);
            try {
                const [schedRes, summaryRes, suggestionsRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL}/api/services/schedule/${encodeURIComponent(cityName)}`),
                    axios.get(`${import.meta.env.VITE_API_URL}/api/feedback/summary/${encodeURIComponent(cityName)}`).catch(() => ({ data: [] })),
                    axios.get(`${import.meta.env.VITE_API_URL}/api/feedback/top-suggestions/${encodeURIComponent(cityName)}`).catch(() => ({ data: [] }))
                ]);
                setSchedule(schedRes.data);
                setCitySummary(summaryRes.data);
                setTopSuggestions(suggestionsRes.data);
            } catch (err) {
                console.error("Fetch failed", err);
                setSchedule(null);
            } finally {
                setScheduleLoading(false);
                setLoadingSuggestions(false);
            }
        };
        fetchScheduleAndFeedback();
    }, [cityName]);

    const handleStar = async (id) => {
        try {
            const { data } = await axios.patch(`${import.meta.env.VITE_API_URL}/api/feedback/star/${id}`);
            setTopSuggestions(prev => prev.map(item => 
                item._id === id ? { 
                    ...item, 
                    starCount: data.starCount, 
                    stars: data.isStarred ? [...(item.stars || []), user?._id] : (item.stars || []).filter(s => s !== user?._id) 
                } : item
            ));
        } catch (error) {
            console.error('Error starring feedback:', error);
        }
    };

    // --- Holiday Fetching Logic (Independent) ---
    useEffect(() => {
        const fetchHoliday = async () => {
            try {
                // Try API first
                const { data } = await axios.get(`https://date.nager.at/api/v3/NextPublicHolidays/IN`);
                if (data && data.length > 0) {
                    setNextHoliday(data[0]);
                } else {
                    throw new Error("No data");
                }
            } catch (err) {
                // Fallback for Indian Holidays 2026/2027
                const fallbacks = [
                    { localName: 'Republic Day', date: '2026-01-26' },
                    { localName: 'Holi', date: '2026-03-03' },
                    { localName: 'Eid-ul-Fitr', date: '2026-03-20' },
                    { localName: 'Ram Navami', date: '2026-03-27' },
                    { localName: 'Independence Day', date: '2026-08-15' },
                    { localName: 'Janmashtami', date: '2026-09-03' },
                    { localName: 'Gandhi Jayanti', date: '2026-10-02' },
                    { localName: 'Dussehra', date: '2026-10-20' },
                    { localName: 'Diwali', date: '2026-11-08' },
                    { localName: 'Christmas Day', date: '2026-12-25' },
                    { localName: 'Republic Day', date: '2027-01-26' },
                    { localName: 'Holi', date: '2027-03-22' }
                ];
                
                const now = new Date();
                const upcoming = fallbacks.find(h => new Date(h.date) > now);
                if (upcoming) setNextHoliday(upcoming);
            }
        };
        fetchHoliday();
    }, []);

    // Helper to map Open-Meteo codes to readable strings
    const getWeatherCondition = (code) => {
        if (code === 0) return 'Clear Sky';
        if (code <= 3) return 'Partly Cloudy';
        if (code <= 49) return 'Foggy';
        if (code <= 69) return 'Rainy';
        if (code <= 79) return 'Snowy';
        return 'Stormy';
    };

    const popularSpots = [...spots].sort((a, b) => b.rating - a.rating).slice(0, 6);
    const highestPriorityProblem = citySummary.length > 0 
        ? [...citySummary].sort((a, b) => b.count - a.count)[0] 
        : null;

    return (
        <div className="container mx-auto">
            {/* Dashboard Header */}
            <div className="mb-10 pb-6 border-b border-gray-100 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
                        Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-civic-500 to-civic-600">{user?.name || 'Citizen'}</span>
                    </h1>
                    <p className="text-gray-500 font-medium flex items-center">
                        <MapPin className="w-4 h-4 mr-1.5 text-civic-400" />
                        Live updates for your current location: <strong className="ml-1 text-gray-700">{cityName}</strong>
                    </p>
                </div>
                <div className="hidden md:flex bg-civic-50 text-civic-600 px-4 py-2 rounded-lg font-semibold text-sm shadow-sm border border-civic-100">
                    Smart City Active
                </div>
            </div>

            {/* City Insights Section */}
            <div className="mb-10">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1 flex items-center">
                    <BarChart3 className="w-3 h-3 mr-2 text-indigo-500" /> City Live Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Insight 1: Live Status */}
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-3 opacity-5">
                            <CheckCircle className="w-16 h-16 text-green-500" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">City Status</p>
                        <div className="flex items-end space-x-2">
                            <span className="text-2xl font-black text-gray-900">Active</span>
                        </div>
                        <div className="text-[10px] text-green-500 mt-2 font-medium flex items-center">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-2" /> Live Systems
                        </div>
                    </div>

                    {/* Insight 2: Pending Issues */}
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-3 opacity-5">
                            <AlertTriangle className="w-16 h-16 text-red-500" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Active Reports</p>
                        <div className="flex items-center space-x-2">
                            <span className="text-2xl font-black text-gray-900">
                                {citySummary.reduce((acc, curr) => curr.status !== 'resolved' ? acc + curr.count : acc, 0)}
                            </span>
                        </div>
                        <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-tighter">Needs Attention</p>
                    </div>

                    {/* Insight 3: Resolved Issues */}
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-3 opacity-5">
                            <CheckCircle className="w-16 h-16 text-green-500" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Issues Resolved</p>
                        <div className="flex items-center space-x-2">
                            <span className="text-2xl font-black text-gray-900">
                                {citySummary.reduce((acc, curr) => curr.status === 'resolved' ? acc + curr.count : acc, 0)}
                            </span>
                            <TrendingUp className="w-3 h-3 text-green-500" />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 font-medium">Efficiency tracking up</p>
                    </div>

                    {/* Insight 4: City Reach */}
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-3 opacity-5">
                            <Users className="w-16 h-16 text-civic-400" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Engagement</p>
                        <div className="flex items-center space-x-2">
                            <span className="text-2xl font-black text-gray-900">{citySummary.reduce((acc, curr) => acc + curr.count, 0)}</span>
                        </div>
                        <p className="text-[10px] text-civic-400 mt-2 font-bold uppercase tracking-tighter">Active Citizens</p>
                    </div>

                    {/* Insight 5: Upcoming Holiday */}
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-3 opacity-5">
                            <PartyPopper className="w-16 h-16 text-purple-500" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Next Holiday</p>
                        {nextHoliday ? (
                            <>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-gray-900 line-clamp-1">{nextHoliday.localName}</span>
                                    <span className="text-xs font-bold text-purple-600">{new Date(nextHoliday.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2 font-medium italic">Public Holiday</p>
                            </>
                        ) : (
                            <div className="h-10 flex items-center justify-center">
                                <div className="w-full h-4 bg-gray-50 animate-pulse rounded"></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Smart Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* WIDGET 1: Weather & Climate (Takes up 4 columns) */}
                <div className="lg:col-span-4 grid grid-cols-1 gap-6">
                    <div className="bg-gradient-to-br from-civic-500 via-civic-400 to-emerald-500 rounded-3xl p-8 text-white shadow-[0_8px_30px_rgb(59,130,246,0.3)] relative overflow-hidden transform transition-all hover:-translate-y-1">
                        {/* Decorative Background Elements */}
                        <div className="absolute -top-10 -right-10 bg-white/10 rounded-full w-40 h-40 blur-2xl"></div>
                        <div className="absolute bottom-0 right-0 opacity-10 transform translate-x-4 translate-y-4">
                            <Cloud className="w-48 h-48 drop-shadow-xl" />
                        </div>
                        
                        <h3 className="font-semibold text-civic-50 flex items-center mb-6 text-sm uppercase tracking-[0.2em] relative z-10">
                            <Thermometer className="w-4 h-4 mr-2" /> Live Climate
                        </h3>

                        {loadingWeather ? (
                            <div className="flex h-40 items-center justify-center relative z-10">
                                <Loader2 className="w-8 h-8 animate-spin text-white opacity-90" />
                            </div>
                        ) : weather ? (
                            <div className="relative z-10">
                                <div className="flex flex-col mb-6">
                                    <span className="text-6xl font-black tracking-tighter drop-shadow-md mb-2">
                                        {weather.temp}°<span className="text-4xl font-semibold opacity-80">C</span>
                                    </span>
                                    <span className="text-xl font-medium opacity-90 tracking-wide bg-white/20 self-start px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">{getWeatherCondition(weather.condition)}</span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-sm mt-8 border-t border-white/20 pt-6">
                                    <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-xl backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors cursor-default">
                                        <div className="bg-white/20 p-2 rounded-lg"><Wind className="w-4 h-4" /></div>
                                        <span className="font-semibold tracking-wide">{weather.wind} km/h</span>
                                    </div>
                                    <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-xl backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors cursor-default">
                                        <div className="bg-white/20 p-2 rounded-lg"><Droplets className="w-4 h-4" /></div>
                                        <span className="font-semibold tracking-wide">{weather.humidity}% Humidity</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-40 flex items-center text-sm opacity-80 relative z-10 font-medium">
                                Enable location access to view live weather data.
                            </div>
                        )}
                    </div>

                    {/* AQI Widget */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                        <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 -mr-16 -mt-16 transition-colors duration-500 ${
                            !aqi ? 'bg-gray-400' :
                            aqi.european_aqi <= 20 ? 'bg-green-500' :
                            aqi.european_aqi <= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center">
                                    <Zap className="w-3 h-3 mr-1 text-amber-500" /> Air Quality (AQI)
                                </h4>
                                {aqi ? (
                                    <div className="flex items-baseline">
                                        <span className="text-3xl font-black text-gray-900 mr-2">{aqi.european_aqi}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                                            aqi.european_aqi <= 20 ? 'bg-green-50 text-green-600 border-green-100' :
                                            aqi.european_aqi <= 40 ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                            'bg-red-50 text-red-600 border-red-100'
                                        }`}>
                                            {aqi.european_aqi <= 20 ? 'Good' : aqi.european_aqi <= 40 ? 'Fair' : 'Poor'}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="h-8 w-24 bg-gray-100 animate-pulse rounded-lg"></div>
                                )}
                            </div>
                            <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                                <AlertTriangle className={`w-5 h-5 ${
                                    !aqi ? 'text-gray-300' :
                                    aqi.european_aqi <= 20 ? 'text-green-500' :
                                    aqi.european_aqi <= 40 ? 'text-yellow-500' : 'text-red-500'
                                }`} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 relative z-10">
                            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">PM2.5</p>
                                <p className="text-sm font-bold text-gray-700">{aqi ? `${aqi.pm2_5} μg/m³` : '--'}</p>
                            </div>
                            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">PM10</p>
                                <p className="text-sm font-bold text-gray-700">{aqi ? `${aqi.pm10} μg/m³` : '--'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* WIDGET 2: Smart Schedules (Takes up 8 columns) */}
                <div className="lg:col-span-8 bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-center relative overflow-hidden group">
                    {/* Decorative Background Blur */}
                    <div className="absolute top-0 right-0 bg-indigo-50/50 rounded-full w-96 h-96 blur-3xl -z-10 group-hover:bg-indigo-100/50 transition-colors duration-700"></div>

                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="font-extrabold text-gray-900 flex items-center text-2xl tracking-tight mb-1">
                                <CalendarClock className="w-6 h-6 mr-3 text-indigo-500" /> 
                                Central Service Timetable
                            </h3>
                            <p className="text-gray-500 text-sm font-medium">
                                Localized schedule verified for {cityName} jurisdiction.
                            </p>
                        </div>
                        <div className="hidden sm:block bg-green-50 text-green-600 border border-green-200 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                            Real-time
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Waste Card */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group/card relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-2 h-full bg-gradient-to-b from-green-400 to-green-600"></div>
                            <div className="flex items-center space-x-4 mb-6">
                                <div className="bg-green-100 group-hover/card:bg-green-600 transition-colors duration-300 rounded-xl p-3 text-green-600 group-hover/card:text-white">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-lg">Waste Collection</h4>
                                    {schedule && schedule.waste && !schedule.isDefault && (
                                        <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">
                                            {schedule.waste.zones} zones active
                                        </span>
                                    )}
                                </div>
                            </div>
                            {scheduleLoading ? (
                                <div className="space-y-2 animate-pulse p-4">
                                    <div className="h-4 bg-gray-200 rounded w-full" />
                                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                                </div>
                            ) : schedule ? (
                                <div className="space-y-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-3">
                                        <span className="text-gray-500 font-bold tracking-wider text-xs uppercase">Collection Days</span>
                                        <span className="font-bold text-gray-900 bg-white px-2 py-1 rounded shadow-sm border border-gray-100">{schedule?.waste?.days}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm pt-1">
                                        <span className="text-gray-500 font-bold tracking-wider text-xs uppercase">Arrival Time</span>
                                        <span className="font-bold text-gray-900 bg-white px-2 py-1 rounded shadow-sm border border-gray-100">{schedule?.waste?.time}</span>
                                    </div>
                                    {schedule?.waste?.notes && (
                                        <p className="text-[10px] text-gray-400 italic mt-2">{schedule.waste.notes}</p>
                                    )}
                                    {schedule?.isDefault && (
                                        <p className="text-[10px] text-amber-600 font-bold mt-2">⚠ Estimated schedule — verify with local municipality</p>
                                    )}
                                </div>
                            ) : (
                                <div className="p-4 flex items-center justify-center text-gray-400 text-sm italic">
                                    Schedule unavailable
                                </div>
                            )}
                        </div>

                        {/* Water Card */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group/card relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-2 h-full bg-gradient-to-b from-civic-300 to-civic-600"></div>
                            <div className="flex items-center space-x-4 mb-6">
                                <div className="bg-civic-100 group-hover/card:bg-civic-500 transition-colors duration-300 rounded-xl p-3 text-civic-500 group-hover/card:text-white">
                                    <Droplets className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-lg">Water Supply</h4>
                                    <span className="text-xs font-semibold text-civic-500 uppercase tracking-wider">Line Active</span>
                                </div>
                            </div>
                            {scheduleLoading ? (
                                <div className="space-y-2 animate-pulse p-4">
                                    <div className="h-4 bg-gray-200 rounded w-full" />
                                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                                </div>
                            ) : schedule ? (
                                <div className="space-y-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-3">
                                        <span className="text-gray-500 font-bold tracking-wider text-xs uppercase">Frequency</span>
                                        <span className="font-bold text-gray-900 bg-white px-2 py-1 rounded shadow-sm border border-gray-100">{schedule?.water?.frequency || 'Daily Pumping'}</span>
                                    </div>
                                    <div className="flex flex-col text-sm pt-1">
                                        <span className="text-gray-500 font-bold tracking-wider text-xs uppercase flex justify-between w-full mb-2">
                                            <span>Active Timings</span>
                                        </span>
                                        <span className="font-bold text-gray-900 bg-white px-3 py-2 rounded shadow-sm border border-gray-100 text-center">{schedule?.water?.timing}</span>
                                    </div>
                                    {schedule?.water?.notes && (
                                        <p className="text-[10px] text-gray-400 italic mt-2">{schedule.water.notes}</p>
                                    )}
                                </div>
                            ) : (
                                <div className="p-4 flex items-center justify-center text-gray-400 text-sm italic">
                                    Schedule unavailable
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Highest Priority Problem Widget */}
                    {highestPriorityProblem && (
                        <div className="mt-6 bg-red-50 rounded-2xl p-5 border border-red-100 flex items-start space-x-4">
                            <div className="bg-red-100 p-3 rounded-xl text-red-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-gray-900 text-lg capitalize">Top Community Priority: {highestPriorityProblem.category}</h4>
                                    <span className="text-xs font-bold text-red-600 uppercase tracking-wider bg-white px-2 py-1 rounded shadow-sm border border-red-100">
                                        {highestPriorityProblem.count} Reports
                                    </span>
                                </div>
                                <p className="text-sm text-gray-700 mt-1 italic">"{highestPriorityProblem.lastReport}"</p>
                                <div className="mt-3 flex items-center">
                                    <div className="h-2 flex-1 bg-white rounded-full overflow-hidden border border-red-100">
                                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min((highestPriorityProblem.count / 20) * 100, 100)}%` }}></div>
                                    </div>
                                    <span className="text-xs text-red-500 font-bold ml-3 uppercase tracking-wider">{highestPriorityProblem.status}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ===== COMMUNITY HIGHLIGHTS (SUGGESTIONS) ===== */}
            <div className="mt-10 mb-10">
                <div className="flex items-center justify-between mb-6 ml-1">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center">
                        <Sparkles className="w-3 h-3 mr-2 text-amber-500" /> Community Highlights
                    </h3>
                    <div className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 uppercase tracking-widest">
                        Most Starred Suggestions
                    </div>
                </div>

                {loadingSuggestions ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <div key={i} className="h-48 bg-white rounded-3xl animate-pulse border border-gray-100 shadow-sm" />)}
                    </div>
                ) : topSuggestions.length === 0 ? (
                    <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-gray-200 shadow-sm">
                        <p className="text-gray-400 font-bold italic">No highlighted suggestions in {cityName} yet. Be the first to suggest something!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {topSuggestions.map((item) => (
                            <div key={item._id} className="group bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100/30 transition-all relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleStar(item._id);
                                        }}
                                        className={`flex items-center space-x-1.5 px-3 py-1 rounded-full border transition-all ${item.stars?.includes(user?._id) ? 'bg-amber-500 border-amber-500 text-white' : 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100'}`}
                                    >
                                        <Star className={`w-3 h-3 ${item.stars?.includes(user?._id) ? 'fill-white' : 'fill-amber-500'}`} />
                                        <span className="text-xs font-black">{item.starCount || 0}</span>
                                    </button>
                                </div>
                                
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs overflow-hidden">
                                        {item.user?.dp ? <img src={item.user.dp} className="w-full h-full object-cover" /> : item.user?.name?.[0]}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-gray-900">{item.user?.name}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{item.category}</p>
                                    </div>
                                </div>

                                <p className="text-gray-700 text-sm font-medium leading-relaxed italic mb-4">
                                    "{item.content.length > 120 ? item.content.substring(0, 120) + '...' : item.content}"
                                </p>

                                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${item.isVerified ? 'text-green-500' : 'text-amber-500'}`}>
                                        {item.isVerified ? 'Approved' : 'Under Review'}
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-300 uppercase">
                                        {new Date(item.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ===== CITY EXPLORER SECTION ===== */}
            <div className="mt-10 mb-20 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-8 border border-gray-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 border-b border-gray-100 pb-5">
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center">
                            <Compass className="w-8 h-8 mr-3 text-amber-500" />
                            City Explorer
                        </h2>
                        <p className="text-gray-500 font-medium mt-2">
                            Discover the top monuments and attractions in <strong className="text-gray-700">{cityName}</strong>.
                        </p>
                    </div>
                    <div className="mt-4 sm:mt-0 flex items-center bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-4 py-2 rounded-full uppercase tracking-wider shadow-sm">
                        <MapPin className="w-3 h-3 mr-1.5" /> City Boundary
                    </div>
                </div>

                <div className="relative min-h-[300px]">
                    {loadingSpots && (
                        <div className="absolute inset-0 z-[10] bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
                            <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-3" />
                            <span className="text-sm font-bold text-amber-700 tracking-wider">LOADING ATTRACTIONS...</span>
                        </div>
                    )}
                    
                    {popularSpots.length === 0 && !loadingSpots ? (
                        <div className="flex flex-col justify-center items-center h-[300px] border border-dashed border-gray-200 rounded-2xl">
                            <Landmark className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-gray-400 font-medium">No state-level famous attractions found nearby.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {popularSpots.map((spot, index) => {
                                const typeColors = {
                                    attraction: { bg: 'bg-amber-50', border: 'border-amber-100', accent: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-100' },
                                    museum: { bg: 'bg-indigo-50', border: 'border-indigo-100', accent: 'bg-indigo-500', text: 'text-indigo-700', light: 'bg-indigo-100' },
                                    monument: { bg: 'bg-rose-50', border: 'border-rose-100', accent: 'bg-rose-500', text: 'text-rose-700', light: 'bg-rose-100' },
                                    fort: { bg: 'bg-orange-50', border: 'border-orange-100', accent: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-100' },
                                    castle: { bg: 'bg-stone-50', border: 'border-stone-200', accent: 'bg-stone-500', text: 'text-stone-700', light: 'bg-stone-200' },
                                };
                                const colors = typeColors[spot.type] || typeColors.attraction;

                                return (
                                    <div
                                        key={spot.id}
                                        className={`group bg-white rounded-2xl p-5 border ${colors.border} shadow-sm hover:shadow-md transition-all duration-300 flex items-start space-x-4 relative overflow-hidden`}
                                    >
                                        <div className={`absolute left-0 top-0 w-1.5 h-full ${colors.accent}`}></div>
                                        
                                        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${colors.bg} ${colors.text} border ${colors.border}`}>
                                            {index + 1}
                                        </div>

                                        <div className="flex-grow">
                                            <div className="flex items-start justify-between mb-1">
                                                <h4 className="font-bold text-gray-900 text-lg leading-snug pr-4">
                                                    {spot.name}
                                                </h4>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.text} ${colors.bg} px-2 py-1 rounded-md border ${colors.border} whitespace-nowrap`}>
                                                    {spot.type.replace(/_/g, ' ')}
                                                </span>
                                            </div>

                                            {spot.description && (
                                                <p className="text-gray-500 text-sm mb-3 line-clamp-2">
                                                    {spot.description}
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                                                <div className="flex items-center space-x-1">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className={`w-3.5 h-3.5 ${i < 4 ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`} />
                                                    ))}
                                                    <span className="text-xs text-gray-400 font-medium ml-2 uppercase tracking-wide">Popular</span>
                                                </div>
                                                {spot.website && (
                                                    <a href={spot.website} target="_blank" rel="noreferrer"
                                                        className={`text-sm font-bold ${colors.text} flex items-center hover:underline`}>
                                                        Read More <ChevronRight className="w-4 h-4 ml-0.5" />
                                                    </a>
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
        </div>
    );
};

export default Dashboard;
