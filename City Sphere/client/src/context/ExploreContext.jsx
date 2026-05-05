import React, { createContext, useEffect, useState, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Haversine Distance (km) ─────────────────────────────────────────────────
const haversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Deterministic Rating ────────────────────────────────────────────────────
const getRating = (name) => {
    let h = 0;
    for (let i = 0; i < name.length; i++)
        h = ((h << 5) - h + name.charCodeAt(i)) & 0xffffffff;
    return 3.5 + (Math.abs(h) % 15) / 10;
};

// ─── Type Detection ───────────────────────────────────────────────────────────
const detectType = (name) => {
    const lower = name.toLowerCase();
    if (['temple', 'mandir', 'masjid', 'church', 'gurudwara', 'mosque', 'dargah', 'monastery', 'ashram', 'shrine'].some(w => lower.includes(w))) return 'monument';
    if (['fort', 'palace', 'mahal', 'qila', 'kila', 'ruins', 'memorial'].some(w => lower.includes(w))) return 'fort';
    if (['museum', 'gallery', 'institute'].some(w => lower.includes(w))) return 'museum';
    if (['park', 'garden', 'sanctuary', 'reserve', 'forest', 'zoo', 'safari', 'deer'].some(w => lower.includes(w))) return 'park';
    if (['cave', 'waterfall', 'falls', 'lake', 'hill', 'peak', 'valley', 'beach', 'springs', 'kund', 'ghat', 'sahastradhara', 'robber'].some(w => lower.includes(w))) return 'nature';
    return 'attraction';
};

// ─── TOURIST KEYWORD WHITELIST ────────────────────────────────────────────────
const TOURIST_KEYWORDS = [
    // Religious / spiritual
    'temple', 'mandir', 'masjid', 'church', 'gurudwara', 'mosque', 'dargah',
    'monastery', 'ashram', 'shrine', 'cathedral', 'pagoda', 'math', 'mutt',
    // Historic / heritage
    'fort', 'palace', 'mahal', 'qila', 'kila', 'ruins', 'memorial', 'tomb',
    'samadhi', 'heritage', 'historical', 'ancient', 'monument', 'statue',
    'gateway', 'minaret', 'mausoleum', 'cenotaph', 'haveli', 'stepwell',
    // Museums / culture
    'museum', 'gallery', 'exhibition', 'planetarium',
    // Parks / nature
    'park', 'garden', 'national park', 'wildlife', 'sanctuary', 'reserve',
    'forest', 'zoo', 'safari', 'botanical', 'arboretum', 'deer park',
    // Water / natural features
    'waterfall', 'falls', 'lake', 'dam', 'reservoir', 'kund', 'ghat',
    'cave', 'gorge', 'canyon', 'cliff', 'rock', 'stream', 'river',
    // Hills / viewpoints
    'hill', 'peak', 'summit', 'ridge', 'valley', 'viewpoint', 'scenic',
    // Leisure / attractions
    'ropeway', 'cable car', 'clock tower', 'island', 'beach', 'resort', 'picnic',
    // Specific regional landmarks by their actual full names or key parts
    'sahastradhara', 'robber cave', 'robbers cave', 'gucchu pani', 'tapkeshwar',
    'lacchiwala', 'lachhiwala', 'malsi', 'mindrolling', 'rajaji', 'tiger falls',
    'kempty', 'mussoorie', 'survey of india', 'clock tower', 'paltan bazaar',
    'tibetan market', 'har ki dun', 'chakrata',
];

// ─── NON-TOURIST BLACKLIST ───────────────────────────────────────────────────
const NON_TOURIST_KEYWORDS = [
    // Admin / Civic / Organizations
    'district', 'tehsil', 'block', 'ward', 'constituency', 'municipal', 'corporation',
    'election', 'parliament', 'assembly', 'secretariat', 'bhavan', 'bhawan', 'council',
    'ministry', 'department', 'government', 'board', 'bureau', 'authority',
    // Transit
    'railway station', 'bus stand', 'airport', 'parking', 'depot',
    // Health
    'hospital', 'clinic', 'dispensary',
    // Education / Official
    'school', 'college', 'university', 'education',
    'police', 'court', 'office', 'laboratory', 'defence', 'cantt', 'cantonment', 'headquarters',
    // Localities / Residential
    'village', 'gram panchayat', 'nagar panchayat',
    'road', 'street', 'nagar', 'colony', 'sector', 'highway', 'expressway',
    'chowk', 'crossing', 'junction', 'vihar', 'enclave', 'extension',
    'phase', 'plot', 'flat', 'apartment', 'residency', 'estate',
    // Infrastructure
    'pdf', 'document', 'map',
    'godown', 'warehouse', 'pump', 'tubewell', 'transformer', 'substation',
    'petrol', 'filling', 'atm', 'bank', 'post office',
];

// ─── EXCEPTIONS WHITELIST ───────────────────────────────────────────────────
const EXCEPTIONS_WHITELIST = [
    'forest research institute',
    'fri',
    'malsi deer park',
    'dehradun zoo',
    'wadia institute',
    'indian military academy',
    'ima',
    'survey of india',
    'mindrolling monastery',
    'rajaji national park',
    'robbers cave',
    'robber cave',
    'gucchu pani',
    'sahastradhara',
    'tapkeshwar',
    'lacchiwala',
    'lachhiwala',
];

// ─── Unified Tourist Place Filter ────────────────────────────────────────────
// UPGRADE: Combined identical logic from wiki and OSM into a single robust function
const isTouristPlace = (name, cityName, isOsm = false) => {
    if (!name || name.trim().length < 3) return false;
    const trimmed = name.trim();
    if (isOsm && /^[A-Z]{0,3}\d+$/.test(trimmed)) return false; // reject highway codes from OSM

    const lower = trimmed.toLowerCase();

    // Reject exact city/state matches
    if (cityName && (lower === cityName.toLowerCase() || lower === cityName.toLowerCase() + ' city')) return false;
    if (['uttarakhand', 'uttar pradesh', 'india', 'state of'].some(s => lower.includes(s))) return false;

    // Exception check runs FIRST (Bypasses the blacklist)
    if (EXCEPTIONS_WHITELIST.some(ex => lower.includes(ex))) return true;

    // Reject if any non-tourist keyword found
    if (NON_TOURIST_KEYWORDS.some(kw => lower.includes(kw))) return false;

    // Must have at least one tourist keyword
    return TOURIST_KEYWORDS.some(kw => lower.includes(kw));
};

const isWikiTouristPlace = (name, cityName) => isTouristPlace(name, cityName, false);
const isOsmTouristPlace = (name, cityName) => isTouristPlace(name, cityName, true);

// ─── Bad image URL detector ───────────────────────────────────────────────────
const isBadImageUrl = (url) => {
    if (!url) return true;
    const bad = ['.svg', 'Flag_', 'Logo_', 'Symbol_', 'locator', 'location', 'map', 'icon', 'pdf', 'document'];
    const lower = url.toLowerCase();
    return bad.some(b => lower.includes(b.toLowerCase()));
};

// ─── API 1: Wikipedia Geosearch → pageid + exact GPS coords ─────────────────
const fetchWikipediaGeosearch = async (lat, lon) => {
    try {
        const res = await axios.get(
            `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=20000&gslimit=500&format=json&origin=*`,
            { timeout: 6000 }
        );
        return res.data?.query?.geosearch || [];
    } catch {
        return [];
    }
};

// ─── API 2: Wikipedia pageimages by PAGEID ────────────────────────────────────
const fetchImageByPageId = async (pageId) => {
    try {
        const res = await axios.get(
            `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&pageids=${pageId}&pithumbsize=600&format=json&origin=*`,
            { timeout: 3000 }
        );
        const page = res.data?.query?.pages?.[String(pageId)];
        const url = page?.thumbnail?.source || null;
        return isBadImageUrl(url) ? null : url;
    } catch {
        return null;
    }
};

// ─── API 3: Wikipedia text search → pageid for OSM places ───────────────────
const findWikipediaPageId = async (placeName, cityName) => {
    try {
        const query = `${placeName} ${cityName}`;
        const res = await axios.get(
            `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&srwhat=text&format=json&origin=*`,
            { timeout: 3000 }
        );
        const results = res.data?.query?.search;
        if (!results?.length) return null;
        const resultTitle = results[0].title.toLowerCase();
        const placeWords = placeName.toLowerCase().split(' ').filter(w => w.length > 3);
        if (placeWords.length === 0) return null;
        const matchCount = placeWords.filter(w => resultTitle.includes(w)).length;
        if (matchCount < Math.ceil(placeWords.length / 2)) return null;
        return results[0].pageid;
    } catch {
        return null;
    }
};

// ─── API 4a: Wikipedia description by PAGEID ─────────────────────────────────
const fetchDescriptionByPageId = async (pageId) => {
    try {
        const res = await axios.get(
            `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&exsentences=2&explaintext&pageids=${pageId}&format=json&origin=*`,
            { timeout: 3000 }
        );
        const page = res.data?.query?.pages?.[String(pageId)];
        return page?.extract?.slice(0, 160) || null;
    } catch {
        return null;
    }
};

// ─── API 4b: Wikipedia description fallback (by title, via action API) ────────
const fetchWikipediaDescription = async (title) => {
    try {
        const res = await axios.get(
            `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&exsentences=2&explaintext&titles=${encodeURIComponent(title)}&format=json&origin=*`,
            { timeout: 3000 }
        );
        const pages = res.data?.query?.pages;
        if (!pages) return null;
        const page = Object.values(pages)[0];
        return page?.extract?.slice(0, 160) || null;
    } catch {
        return null;
    }
};

// ─── API 5: Wikimedia Commons image fallback ─────────────────────────────────
const fetchCommonsImage = async (placeName, cityName) => {
    try {
        const query = `${placeName} ${cityName}`;
        const res = await axios.get(
            `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json&origin=*`,
            { timeout: 4000 }
        );
        const pages = res.data?.query?.pages;
        if (!pages) return null;
        const candidates = Object.values(pages);
        for (const c of candidates) {
            const url = c?.imageinfo?.[0]?.thumburl || null;
            if (!isBadImageUrl(url)) return url;
        }
        return null;
    } catch {
        return null;
    }
};

// ─── API 6: Overpass for OSM-tagged tourist places ───────────────────────────
const buildOverpassQuery = (lat, lon) => `
    [out:json][timeout:30];
    (
        node["tourism"~"attraction|museum|viewpoint|theme_park|zoo|aquarium|artwork|gallery|picnic_site"](around:25000,${lat},${lon});
        way["tourism"~"attraction|museum|viewpoint|theme_park|zoo|aquarium|picnic_site"](around:25000,${lat},${lon});
        node["historic"~"monument|fort|castle|memorial|temple|shrine|ruins|tomb|palace"](around:25000,${lat},${lon});
        way["historic"~"monument|fort|castle|memorial|ruins|palace"](around:25000,${lat},${lon});
        node["leisure"~"park|garden|nature_reserve|recreation_ground"](around:25000,${lat},${lon});
        way["leisure"~"park|garden|nature_reserve|recreation_ground"](around:25000,${lat},${lon});
        node["natural"~"waterfall|cave_entrance|peak|hot_spring|spring|beach"](around:25000,${lat},${lon});
        way["natural"~"waterfall|cave_entrance|water|wood"](around:25000,${lat},${lon});
        node["amenity"="place_of_worship"]["name"](around:25000,${lat},${lon});
        way["amenity"="place_of_worship"]["name"](around:25000,${lat},${lon});
    );
    out center 80;
`;

const fetchOverpassPlaces = async (lat, lon, cityName) => {
    const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
    ];
    for (const url of endpoints) {
        try {
            const res = await axios.post(url, buildOverpassQuery(lat, lon), {
                headers: { 'Content-Type': 'text/plain' },
                timeout: 30000,
            });
            if (res.data?.elements) {
                const seen = new Set();
                return res.data.elements
                    .filter(el => el.tags?.name && isOsmTouristPlace(el.tags.name, cityName))
                    .filter(el => {
                        const key = el.tags.name.toLowerCase().trim();
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    })
                    .map(el => {
                        const sLat = el.lat ?? el.center?.lat;
                        const sLon = el.lon ?? el.center?.lon;
                        let type = 'attraction';
                        if (el.tags.tourism === 'museum') type = 'museum';
                        else if (['fort', 'castle', 'palace'].includes(el.tags.historic)) type = 'fort';
                        else if (['monument', 'memorial', 'shrine', 'temple', 'tomb'].includes(el.tags.historic)) type = 'monument';
                        else if (el.tags.amenity === 'place_of_worship') type = 'monument';
                        else if (['park', 'garden', 'nature_reserve', 'recreation_ground'].includes(el.tags.leisure)) type = 'park';
                        else if (['waterfall', 'cave_entrance', 'peak', 'spring', 'hot_spring', 'beach'].includes(el.tags.natural)) type = 'nature';
                        else if (el.tags.tourism === 'picnic_site') type = 'park';
                        return {
                            id: `osm_${el.id}`,
                            name: el.tags.name.trim(),
                            lat: sLat,
                            lon: sLon,
                            type,
                            distance: (sLat && sLon) ? haversine(lat, lon, sLat, sLon) : 999,
                            rating: getRating(el.tags.name),
                            description: null,
                            image: null,
                            pageid: null,
                            isOSM: true,
                        };
                    });
            }
        } catch { /* try next mirror */ }
    }
    return [];
};

// ─── HARDCODED FALLBACK PLACES ───────────────────────────────
// UPGRADE: Added direct Wikipedia image URLs and fixed high ratings for iconic places.
// This guarantees these places always look perfect even if external APIs timeout.
const HARDCODED_PLACES = {
    'dehradun': [
        // To use a custom image (overriding Wikipedia), simply add a customImage property.
        // Example: { name: 'Secret Spot', ..., customImage: 'https://images.unsplash.com/photo-123' }
        { name: 'Robbers Cave (Gucchu Pani)', lat: 30.3786, lon: 78.0109, type: 'nature', wikiSearch: 'Robber\'s Cave, India', rating: 4.8 },
        { name: 'Sahastradhara', lat: 30.3892, lon: 78.1168, type: 'nature', wikiSearch: 'Sahastradhara', rating: 4.6, customImage: 'https://cdnbbsr.s3waas.gov.in/s3ad9db03f1a981f9593f55f9c6ac84644/uploads/2025/03/20250328467755685.jpg' },
        { name: 'Lachhiwala Nature Park', lat: 30.2156, lon: 78.0892, type: 'park', wikiSearch: 'Lachhiwala', rating: 4.5, customImage: 'https://rajajijunglesafari.com/wp-content/uploads/lachhiwala-dehradun.jpg' },
        { name: 'Forest Research Institute', lat: 30.3422, lon: 77.9997, type: 'museum', wikiSearch: 'Forest Research Institute (India)', rating: 4.9 },
        { name: 'Tapkeshwar Temple', lat: 30.3608, lon: 77.9831, type: 'monument', wikiSearch: 'Tapkeshwar Temple', rating: 4.7 },
        { name: 'Malsi Deer Park', lat: 30.3851, lon: 78.0267, type: 'park', wikiSearch: 'Dehradun Zoo', rating: 4.5, customImage: 'https://cdnbbsr.s3waas.gov.in/s3ad9db03f1a981f9593f55f9c6ac84644/uploads/2025/03/202503291659273634.png' },
        { name: 'Mindrolling Monastery', lat: 30.2913, lon: 78.0474, type: 'monument', wikiSearch: 'Mindrolling Monastery', rating: 4.8 },
        { name: 'Paltan Bazaar', lat: 30.3246, lon: 78.0408, type: 'attraction', wikiSearch: 'Paltan Bazaar', rating: 4.3 },
        { name: 'Tibetan Market', lat: 30.3233, lon: 78.0394, type: 'attraction', wikiSearch: 'Dehradun', rating: 4.4, customImage: 'https://seawatersports.com/images/places/shopping-at-tibetan-market.jpg' },
        { name: 'Survey of India Museum', lat: 30.3167, lon: 78.0300, type: 'museum', wikiSearch: 'Survey of India', rating: 4.2 },
        { name: 'Indian Military Academy', lat: 30.3472, lon: 78.0319, type: 'attraction', wikiSearch: 'Indian Military Academy', rating: 4.8 },
        { name: 'Santala Devi Temple', lat: 30.3995, lon: 78.0496, type: 'monument', wikiSearch: 'Santala Devi Temple', rating: 4.7, customImage: 'https://lh3.googleusercontent.com/gps-cs-s/APNQkAGev16rLR25R2nTBr5Uk_VltXpwZZq8fLbxaxkQ7_r75Bka96bnBPOqsMtgOTTzJgayuu04E-SCMGOx5LwU_Ruhs-l4Tgq0I314uZ3MRfZow53FJ4i0gsvm9aiXWOU_H0uuEtncbw=s1360-w1360-h1020-rw' },
    ]
};

const getHardcodedPlaces = (cityName, userLat, userLon) => {
    let matchKey = null;
    
    // Check if the user is physically near Dehradun (Center coordinates: 30.3165, 78.0322)
    // Even if Nominatim calls their area "Clement Town" or "Prem Nagar", this will override it.
    const distToDehradun = haversine(userLat, userLon, 30.3165, 78.0322);
    if (distToDehradun <= 35) {
        matchKey = 'dehradun';
    } else {
        const key = cityName.toLowerCase().trim();
        matchKey = Object.keys(HARDCODED_PLACES).find(k => key.includes(k) || k.includes(key));
    }

    if (!matchKey || !HARDCODED_PLACES[matchKey]) return [];
    
    return HARDCODED_PLACES[matchKey].map(p => ({
        id: `hardcoded_${p.name.replace(/\s+/g, '_')}`,
        name: p.name,
        lat: p.lat,
        lon: p.lon,
        type: p.type,
        distance: haversine(userLat, userLon, p.lat, p.lon),
        rating: p.rating || getRating(p.name),
        image: p.customImage || null,
        description: null,
        pageid: null,
        isHardcoded: true,
        wikiSearch: p.wikiSearch,
    }));
};

// ─── Context ──────────────────────────────────────────────────────────────────
export const ExploreContext = createContext();

// ─── Module-level enrichment cache ───────────────────────────────────────────
// Persists across navigations (not across full page reloads)
let _enrichCache = {};       // { [spotId]: enrichedSpot }
let _lastFetchCity = null;   // prevents re-fetching for the same city

export const ExploreProvider = ({ children }) => {
    const { user } = useContext(AuthContext);

    const [userCoords, setUserCoords] = useState(null);
    const [cityName, setCityName] = useState('');
    const [spots, setSpots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savedIds, setSavedIds] = useState(new Set());
    const [navDestination, setNavDestination] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const abortRef = useRef(null);

    // ── Step 1: Detect user location + city name ─────────────────────────────
    useEffect(() => {
        if (!navigator.geolocation) { setLoading(false); return; }
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude: lat, longitude: lon } = pos.coords;
                setUserCoords({ lat, lon });
                try {
                    const geo = await axios.get(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
                        { timeout: 4000 }
                    );
                    const addr = geo.data.address;
                    setCityName(addr.city || addr.town || addr.county || 'your city');
                } catch {
                    setCityName('your city');
                }
            },
            () => setLoading(false)
        );
    }, []);

    // ── Step 2: Fetch + Enrich Places ────────────────────────────────────────
    useEffect(() => {
        if (!userCoords || !cityName) return;
        const { lat, lon } = userCoords;

        // If we already have cached spots for this city, show them instantly
        const cacheKey = cityName.toLowerCase().trim();
        if (_lastFetchCity === cacheKey && Object.keys(_enrichCache).length > 0 && refreshTrigger === 0) {
            const cached = Object.values(_enrichCache);
            if (cached.length > 0) {
                setSpots(cached);
                setLoading(false);
                return;
            }
        }

        // Abort any in-flight fetch from a previous trigger
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const loadContent = async () => {
            setLoading(true);

            // ── A: Fetch from Wikipedia, Overpass, AND hardcoded list in parallel ──
            const [wikiGeoResults, osmResults] = await Promise.all([
                fetchWikipediaGeosearch(lat, lon),
                fetchOverpassPlaces(lat, lon, cityName),
            ]);

            if (controller.signal.aborted) return;

            const hardcodedResults = getHardcodedPlaces(cityName, lat, lon);

            // ── B: Filter Wikipedia results with STRICT tourist whitelist ───
            const wikiPlaces = wikiGeoResults
                .filter(p => isWikiTouristPlace(p.title, cityName))
                .map(p => ({
                    id: `wiki_${p.pageid}`,
                    pageid: p.pageid,
                    name: p.title,
                    lat: p.lat,
                    lon: p.lon,
                    distance: haversine(lat, lon, p.lat, p.lon),
                    type: detectType(p.title),
                    rating: getRating(p.title),
                    image: null,
                    description: null,
                    isWiki: true,
                }));

            // ── C: Community suggestions from backend ───────────────────────
            let communityPlaces = [];
            try {
                const { data: approved } = await axios.get(
                    `${API_URL}/api/suggestions/approved/${encodeURIComponent(cityName)}`
                );
                communityPlaces = approved.map(p => ({
                    id: p._id,
                    name: p.name,
                    type: p.type,
                    lat: p.lat,
                    lon: p.lon,
                    image: p.imageUrl || null,
                    description: p.description || `Community suggested ${p.type} in ${cityName}`,
                    rating: getRating(p.name),
                    distance: haversine(lat, lon, p.lat, p.lon),
                    isCommunity: true,
                }));
            } catch { /* silent */ }

            if (controller.signal.aborted) return;

            // ── D: Merge all sources, deduplicate ────────────────────────────
            const accepted = [];
            const normalizeName = (name) => name ? name.toLowerCase().replace(/[^\\w\\s]/g, '').replace(/\\s+/g, ' ').trim() : '';

            const allPlaces = [...hardcodedResults, ...wikiPlaces, ...osmResults, ...communityPlaces];

            const unique = allPlaces
                .filter(p => {
                    if (!p.lat || !p.lon) return false;
                    if (p.distance > 30) return false;
                    
                    const normName = normalizeName(p.name);
                    const normWiki = normalizeName(p.wikiSearch);
                    
                    const isDuplicate = accepted.some(a => {
                        if (p.isHardcoded && a.isHardcoded) return false;
                        
                        const aNormName = normalizeName(a.name);
                        const aNormWiki = normalizeName(a.wikiSearch);
                        
                        if (normName === aNormName) return true;
                        if (normWiki && normWiki === aNormName) return true;
                        if (aNormWiki && aNormWiki === normName) return true;
                        
                        const dist = haversine(p.lat, p.lon, a.lat, a.lon);
                        if (dist < 1.5) {
                            const genericWords = ['temple', 'park', 'museum', 'institute', 'national', 'cave', 'falls', 'waterfall', 'market', 'bazaar', 'zoo', 'garden', 'valley', 'monument', 'fort', 'palace'];
                            const pWords = normName.split(' ').filter(w => w.length > 3 && !genericWords.includes(w));
                            const aWords = aNormName.split(' ').filter(w => w.length > 3 && !genericWords.includes(w));
                            if (pWords.length > 0 && pWords.some(w => aWords.includes(w))) return true;
                            
                            if (aNormName.length > 5 && normName.includes(aNormName)) return true;
                            if (normName.length > 5 && aNormName.includes(normName)) return true;
                            
                            if (dist < 0.25 && p.type === a.type) return true;
                        }
                        return false;
                    });
                    
                    if (isDuplicate) return false;
                    accepted.push(p);
                    return true;
                })
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 25); 

            // ── E: Enrich each place with image + description ─────────────
            // Use cache to skip already-enriched places
            const enrichOne = async (spot) => {
                // Return from cache if already enriched
                if (_enrichCache[spot.id] && _enrichCache[spot.id].image) {
                    return { ..._enrichCache[spot.id], distance: spot.distance };
                }
                if (spot.isCommunity && spot.image) {
                    _enrichCache[spot.id] = spot;
                    return spot;
                }

                let resolvedPageId = spot.pageid || null;

                // Search Wikipedia for OSM and Hardcoded places
                if (!resolvedPageId && (spot.isOSM || spot.isHardcoded)) {
                    const searchTerm = spot.wikiSearch || spot.name;
                    resolvedPageId = await findWikipediaPageId(searchTerm, cityName);
                }

                const description = resolvedPageId
                    ? await fetchDescriptionByPageId(resolvedPageId)
                        .then(d => d || fetchWikipediaDescription(spot.name))
                        .then(d => d || `A well-known ${spot.type} located in ${cityName}.`)
                    : await fetchWikipediaDescription(spot.wikiSearch || spot.name)
                        .then(d => d || `A well-known ${spot.type} located in ${cityName}.`);

                let image = spot.image || null;

                if (!image && resolvedPageId) {
                    image = await fetchImageByPageId(resolvedPageId);
                }

                if (!image) {
                    image = await fetchCommonsImage(spot.wikiSearch || spot.name, cityName);
                }

                if (!image) {
                    image = `https://picsum.photos/seed/${encodeURIComponent(spot.name)}/500/350`;
                }

                const enriched = {
                    ...spot,
                    image,
                    description,
                    website: resolvedPageId
                        ? `https://en.wikipedia.org/wiki?curid=${resolvedPageId}`
                        : `https://en.wikipedia.org/wiki/${encodeURIComponent(spot.wikiSearch || spot.name)}`,
                };

                _enrichCache[spot.id] = enriched;
                return enriched;
            };

            // Batch enrichment: 8 concurrent, show results progressively
            const BATCH_SIZE = 8;
            const enriched = [];
            for (let i = 0; i < unique.length; i += BATCH_SIZE) {
                if (controller.signal.aborted) return;
                const batch = unique.slice(i, i + BATCH_SIZE);
                const results = await Promise.all(batch.map(enrichOne));
                enriched.push(...results);
                // Show places as they load — progressive rendering
                setSpots([...enriched]);
                // Stop the spinner after the first batch — user sees content immediately
                if (i === 0) setLoading(false);
            }

            _lastFetchCity = cacheKey;
        };

        loadContent();

        return () => controller.abort();
    }, [userCoords, cityName, refreshTrigger]);

    // ── Step 3: Load saved places from backend ───────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        axios
            .get(`${API_URL}/api/places/saved`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then(res => setSavedIds(new Set(res.data.map(p => p.placeId))))
            .catch(() => {});
    }, [user]);

    // ── Step 4: Toggle Save ───────────────────────────────────────────────────
    const toggleSave = async (spot) => {
        const token = localStorage.getItem('token');
        if (!token) { alert('Please login to save places'); return; }
        try {
            const res = await axios.put(
                `${API_URL}/api/places/save`,
                { placeId: spot.id, name: spot.name, type: spot.type, lat: spot.lat, lon: spot.lon },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSavedIds(new Set(res.data.savedPlaces.map(p => p.placeId)));
        } catch (err) {
            console.error('Save error:', err);
        }
    };

    const refreshPlaces = () => {
        // Clear cache on manual refresh to force re-fetch
        _enrichCache = {};
        _lastFetchCity = null;
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <ExploreContext.Provider value={{
            userCoords, cityName, spots, setSpots, loading,
            savedIds, toggleSave,
            navDestination, setNavDestination,
            refreshPlaces,
        }}>
            {children}
        </ExploreContext.Provider>
    );
};
