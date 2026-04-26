import React, { useEffect, useState, useRef, useContext } from 'react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, MapPin, Navigation, X, ChevronDown, ChevronUp } from 'lucide-react';
import { ExploreContext } from '../../context/ExploreContext';

// ─── Layer Config ─────────────────────────────────────────────
const LAYER_CONFIG = {
    emergency: {
        label: 'Emergency Services',
        desc: 'Hospitals, police, fire stations',
        color: '#DC2626',
        icon: (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
                <circle cx="12" cy="10" r="3" />
            </svg>
        ),
    },
    waste: {
        label: 'Waste Collection',
        desc: 'Active garbage truck routes',
        color: '#16A34A',
        icon: (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
                <path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14" />
                <circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" />
            </svg>
        ),
    },
    water: {
        label: 'Water Supply',
        desc: 'Main water pipeline routes',
        color: '#2563EB',
        icon: (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
            </svg>
        ),
    },
};

const MapComponent = () => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const layerGroups = useRef({
        emergency: null,
        waste: null,
        water: null,
        route: null,
    });
    const destMarkerRef = useRef(null);

    const [mapError, setMapError] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [cityName, setCityName] = useState('Detecting city...');
    const [isFetchingLayer, setIsFetchingLayer] = useState(false);
    const [routeInfo, setRouteInfo] = useState(null);
    const [panelOpen, setPanelOpen] = useState(true);

    const { navDestination, setNavDestination } = useContext(ExploreContext);

    const [layers, setLayers] = useState({
        emergency: false,
        waste: false,
        water: false,
    });

    // ── Map Init ──────────────────────────────────────────────
    useEffect(() => {
        if (!mapRef.current || mapInstance.current) return;

        const fallbackLocation = [20.5937, 78.9629];
        const map = L.map(mapRef.current, { zoomControl: false }).setView(fallbackLocation, 5);
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        }).addTo(map);

        mapInstance.current = map;

        layerGroups.current.emergency = L.layerGroup().addTo(map);
        layerGroups.current.waste = L.layerGroup().addTo(map);
        layerGroups.current.water = L.layerGroup().addTo(map);
        layerGroups.current.route = L.layerGroup().addTo(map);

        initUserLocation();

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []);

    // ── Geolocation ───────────────────────────────────────────
    const initUserLocation = () => {
        if (!navigator.geolocation) {
            setCityName('Geolocation not supported');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const loc = [position.coords.latitude, position.coords.longitude];
                setUserLocation(loc);

                if (mapInstance.current) {
                    mapInstance.current.flyTo(loc, 14, { duration: 1.5 });
                }

                const userIcon = L.divIcon({
                    className: '',
                    html: `<div style="position:relative;width:16px;height:16px;">
                        <div style="position:absolute;background:#1B4D3E;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);z-index:2;"></div>
                        <div style="position:absolute;background:#1B4D3E;width:14px;height:14px;border-radius:50%;opacity:0.4;animation:loc-ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
                    </div>`,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8],
                });

                L.marker(loc, { icon: userIcon })
                    .bindPopup("<b style='color:#1B4D3E'>Your location</b>")
                    .addTo(mapInstance.current);

                try {
                    const { data } = await axios.get(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc[0]}&lon=${loc[1]}&zoom=10`
                    );
                    setCityName(data.address.city || data.address.town || data.address.state || 'Local Area');
                } catch {
                    setCityName('Local Area');
                }
            },
            () => setCityName('India'),
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    // ── Navigation Routing ────────────────────────────────────
    useEffect(() => {
        if (!navDestination || !userLocation) return;
        const map = mapInstance.current;
        if (!map) return;

        const drawRoute = async () => {
            setIsFetchingLayer(true);

            layerGroups.current.route.clearLayers();
            if (destMarkerRef.current) {
                map.removeLayer(destMarkerRef.current);
                destMarkerRef.current = null;
            }

            try {
                const coordString = `${userLocation[1]},${userLocation[0]};${navDestination.lon},${navDestination.lat}`;
                const { data } = await axios.get(
                    `https://router.project-osrm.org/route/v1/driving/${coordString}?geometries=geojson&overview=full&steps=true`,
                    { timeout: 10000 }
                );

                if (data.routes?.length > 0) {
                    const route = data.routes[0];
                    const coords = route.geometry.coordinates.map((c) => [c[1], c[0]]);

                    // Route shadow
                    L.polyline(coords, { color: '#93c5fd', weight: 8, opacity: 0.4 }).addTo(layerGroups.current.route);
                    // Route line
                    L.polyline(coords, { color: '#1B4D3E', weight: 4, opacity: 1 }).addTo(layerGroups.current.route);

                    // Destination marker
                    const destIcon = L.divIcon({
                        className: '',
                        html: `<div style="width:12px;height:12px;background:#DC2626;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
                        iconSize: [12, 12],
                        iconAnchor: [6, 6],
                    });
                    destMarkerRef.current = L.marker([navDestination.lat, navDestination.lon], { icon: destIcon })
                        .bindPopup(`<b>${navDestination.name}</b><br/><span style='color:#6b7280;font-size:12px'>Destination</span>`)
                        .addTo(map);
                    destMarkerRef.current.openPopup();

                    map.fitBounds(
                        [
                            [userLocation[0], userLocation[1]],
                            [navDestination.lat, navDestination.lon],
                        ],
                        { padding: [60, 60] }
                    );

                    setRouteInfo({
                        distance: (route.distance / 1000).toFixed(1),
                        duration: Math.ceil(route.duration / 60),
                        destName: navDestination.name,
                    });
                }
            } catch (err) {
                console.error('Routing error:', err);
            }
            setIsFetchingLayer(false);
        };

        drawRoute();
    }, [navDestination, userLocation]);

    const clearRoute = () => {
        layerGroups.current.route?.clearLayers();
        if (destMarkerRef.current && mapInstance.current) {
            mapInstance.current.removeLayer(destMarkerRef.current);
            destMarkerRef.current = null;
        }
        setNavDestination(null);
        setRouteInfo(null);
    };

    // ── Layer Data Fetching ───────────────────────────────────
    const fetchEmergencyServices = async () => {
        if (!userLocation) return;
        setIsFetchingLayer(true);
        try {
            const radius = 5000;
            const query = `
                [out:json][timeout:25];
                (
                  node["amenity"~"hospital|police|fire_station"](around:${radius}, ${userLocation[0]}, ${userLocation[1]});
                  way["amenity"~"hospital|police|fire_station"](around:${radius}, ${userLocation[0]}, ${userLocation[1]});
                );
                out center;
            `;
            const { data } = await axios.post('https://overpass-api.de/api/interpreter', query, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            data.elements.forEach((el) => {
                const lat = el.lat || el.center?.lat;
                const lon = el.lon || el.center?.lon;
                if (!lat || !lon) return;

                const tags = el.tags || {};
                const name = tags.name || 'Unnamed Facility';
                const type = tags.amenity;

                let color = '#DC2626';
                let label = 'H';
                if (type === 'police') { color = '#2563EB'; label = 'P'; }
                if (type === 'fire_station') { color = '#D97706'; label = 'F'; }

                const icon = L.divIcon({
                    html: `<div style="background:${color};color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);font-family:'DM Sans',sans-serif;">${label}</div>`,
                    className: '',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12],
                });

                L.marker([lat, lon], { icon })
                    .bindPopup(`<b>${name}</b><br/><span style="text-transform:capitalize;color:#6b7280;font-size:12px">${type.replace('_', ' ')}</span>`)
                    .addTo(layerGroups.current.emergency);
            });
        } catch (error) {
            console.error('Failed to fetch emergency data', error);
        }
        setIsFetchingLayer(false);
    };

    const fetchSimulatedRoute = async (layerType) => {
        if (!userLocation) return;
        setIsFetchingLayer(true);
        try {
            const offset = 0.015;
            const r1 = Math.random() * offset - offset / 2;
            const r2 = Math.random() * offset - offset / 2;
            const r3 = Math.random() * offset - offset / 2;
            const r4 = Math.random() * offset - offset / 2;

            const points = [
                [userLocation[1] + r1, userLocation[0] + r2],
                [userLocation[1], userLocation[0]],
                [userLocation[1] + r3 + 0.01, userLocation[0] - r4],
                [userLocation[1] - r1, userLocation[0] + 0.01],
            ];

            const coordString = points.map((p) => `${p[0]},${p[1]}`).join(';');
            const { data } = await axios.get(
                `https://router.project-osrm.org/route/v1/driving/${coordString}?geometries=geojson&overview=full`
            );

            if (data.routes?.length > 0) {
                const coordinates = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
                const color = layerType === 'waste' ? '#16A34A' : '#2563EB';
                const dashed = layerType === 'waste' ? '10, 10' : '';

                const polyline = L.polyline(coordinates, {
                    color,
                    weight: 4,
                    opacity: 0.8,
                    dashArray: dashed,
                    lineJoin: 'round',
                }).addTo(layerGroups.current[layerType]);

                const label = layerType === 'waste' ? 'Active Garbage Truck Route' : 'Main Water Supply Line';
                polyline.bindPopup(`<b>${label}</b><br/><span style="color:#6b7280;font-size:12px">Simulated real-time tracking</span>`);
            }
        } catch (error) {
            console.error(`Failed to fetch routing for ${layerType}`, error);
        }
        setIsFetchingLayer(false);
    };

    // ── Toggle Handler ────────────────────────────────────────
    const toggleLayer = async (layerKey) => {
        const isTurningOn = !layers[layerKey];
        setLayers((prev) => ({ ...prev, [layerKey]: isTurningOn }));

        if (isTurningOn) {
            const group = layerGroups.current[layerKey];
            if (group.getLayers().length === 0) {
                if (layerKey === 'emergency') await fetchEmergencyServices();
                if (layerKey === 'waste') await fetchSimulatedRoute('waste');
                if (layerKey === 'water') await fetchSimulatedRoute('water');
            } else {
                mapInstance.current.addLayer(group);
            }
        } else {
            mapInstance.current.removeLayer(layerGroups.current[layerKey]);
        }
    };

    // ── Render ────────────────────────────────────────────────
    if (mapError) {
        return (
            <div className="flex flex-col justify-center items-center h-full min-h-[500px] text-center p-8 text-red-600 bg-red-50 rounded-lg border border-red-200">
                <MapPin className="w-10 h-10 mb-3 opacity-70" />
                <h3 className="text-base font-semibold">Location Error</h3>
                <p className="mt-1 text-sm text-red-500">{mapError}</p>
            </div>
        );
    }

    return (
        <div className="w-full h-[calc(100vh-80px)] min-h-[500px] relative border border-border rounded-lg overflow-hidden bg-gray-100">

            {/* ── Layer Control Panel ─────────────────────────── */}
            <div className="absolute top-3 left-3 z-[400] w-[280px]">
                {/* Panel Header — always visible */}
                <button
                    onClick={() => setPanelOpen(!panelOpen)}
                    className="w-full bg-white border border-border rounded-lg px-4 py-3 flex items-center justify-between shadow-sm hover:shadow transition-shadow"
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-4 h-4 text-civic-500 flex-shrink-0" />
                        <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">{cityName}</h3>
                            <p className="text-[11px] text-gray-500 font-medium tracking-wide uppercase">Live Map</p>
                        </div>
                    </div>
                    {panelOpen ? (
                        <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                </button>

                {/* Panel Body — collapsible */}
                {panelOpen && (
                    <div className="mt-1 bg-white border border-border rounded-lg shadow-sm overflow-hidden">
                        {/* Section Header */}
                        <div className="px-4 pt-3 pb-2">
                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Map Layers</span>
                        </div>

                        {/* Layer Toggles */}
                        <div className="px-2 pb-2">
                            {Object.entries(LAYER_CONFIG).map(([key, cfg]) => (
                                <button
                                    key={key}
                                    onClick={() => toggleLayer(key)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
                                        layers[key]
                                            ? 'bg-gray-50'
                                            : 'hover:bg-gray-50'
                                    }`}
                                >
                                    {/* Legend Swatch */}
                                    <span
                                        className="w-3 h-3 rounded-sm flex-shrink-0 border"
                                        style={{
                                            backgroundColor: layers[key] ? cfg.color : 'transparent',
                                            borderColor: cfg.color,
                                        }}
                                    />
                                    {/* Label */}
                                    <div className="flex-grow min-w-0">
                                        <p className={`text-sm font-medium leading-tight ${layers[key] ? 'text-gray-900' : 'text-gray-600'}`}>
                                            {cfg.label}
                                        </p>
                                        <p className="text-[11px] text-gray-400 leading-tight">{cfg.desc}</p>
                                    </div>
                                    {/* Toggle Switch */}
                                    <div
                                        className={`w-8 h-[18px] rounded-full flex items-center flex-shrink-0 transition-colors ${
                                            layers[key] ? 'justify-end' : 'justify-start'
                                        }`}
                                        style={{ backgroundColor: layers[key] ? cfg.color : '#d1d5db' }}
                                    >
                                        <div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm mx-0.5" />
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Legend — shown when any layer is active */}
                        {Object.values(layers).some(Boolean) && (
                            <div className="border-t border-border px-4 py-2.5">
                                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Legend</span>
                                <div className="mt-1.5 space-y-1">
                                    {layers.emergency && (
                                        <>
                                            <LegendItem color="#DC2626" label="Hospital" symbol="H" />
                                            <LegendItem color="#2563EB" label="Police Station" symbol="P" />
                                            <LegendItem color="#D97706" label="Fire Station" symbol="F" />
                                        </>
                                    )}
                                    {layers.waste && (
                                        <LegendItem color="#16A34A" label="Waste collection route" type="dashed" />
                                    )}
                                    {layers.water && (
                                        <LegendItem color="#2563EB" label="Water supply line" type="solid" />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Loading indicator */}
                        {isFetchingLayer && (
                            <div className="border-t border-border px-4 py-2 flex items-center gap-2 text-gray-500">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span className="text-xs font-medium">Fetching live data...</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Route Info Strip (Google Maps style) ─────────── */}
            {routeInfo && (
                <div className="absolute bottom-3 left-3 right-3 md:left-1/2 md:-translate-x-1/2 md:right-auto z-[400] bg-white border border-border rounded-lg shadow-md flex items-center gap-4 px-4 py-3 md:min-w-[360px] md:max-w-[480px]">
                    <div className="w-9 h-9 rounded-md bg-civic-500 flex items-center justify-center flex-shrink-0">
                        <Navigation className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-grow min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{routeInfo.destName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm font-semibold text-civic-500">{routeInfo.distance} km</span>
                            <span className="text-gray-300">·</span>
                            <span className="text-sm text-gray-500">~{routeInfo.duration} min drive</span>
                        </div>
                    </div>
                    <button
                        onClick={clearRoute}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                        title="Dismiss route"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ── Map Container ────────────────────────────────── */}
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} className="z-[10]" />
        </div>
    );
};

// ── Legend Item Sub-component ──────────────────────────────────
const LegendItem = ({ color, label, symbol, type }) => {
    return (
        <div className="flex items-center gap-2">
            {symbol ? (
                <span
                    className="w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: color }}
                >
                    {symbol}
                </span>
            ) : (
                <span className="flex-shrink-0 w-4 flex items-center">
                    <span
                        className="w-full h-0.5"
                        style={{
                            backgroundColor: color,
                            borderBottom: type === 'dashed' ? `2px dashed ${color}` : `2px solid ${color}`,
                            height: 0,
                        }}
                    />
                </span>
            )}
            <span className="text-xs text-gray-600">{label}</span>
        </div>
    );
};

export default MapComponent;
