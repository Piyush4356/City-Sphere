import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom icons
const wasteIcon = L.divIcon({ html: '<div style="font-size: 24px;">🗑️</div>', className: '', iconSize: [24, 24] });
const waterIcon = L.divIcon({ html: '<div style="font-size: 24px;">💧</div>', className: '', iconSize: [24, 24] });

// Fits map to all markers
const FitBounds = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lon]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
};

const ServiceRouteMap = ({ cityName }) => {
  const [points, setPoints] = useState([]);
  const [route, setRoute] = useState(null);
  const [cityCoords, setCityCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('waste'); // 'waste' or 'water'

  useEffect(() => {
    if (!cityName || cityName === 'Detecting Location...' || cityName === 'Location Access Denied') return;
    
    const load = async () => {
      setLoading(true);
      try {
        // 1. Fetch service points from your backend
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/services/points/${encodeURIComponent(cityName)}`
        );
        setCityCoords(data.cityCoords);
        setPoints(data.points);

        // 2. Filter to active type and get route from OSRM
        const filtered = (data?.points || []).filter(p =>
          activeType === 'waste'
            ? ['waste_disposal', 'recycling'].includes(p.type)
            : ['water_tower', 'pumping_station'].includes(p.type)
        );

        if (filtered.length >= 2) {
          await fetchRoute(filtered);
        } else {
          setRoute(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [cityName, activeType]);

  const fetchRoute = async (pts) => {
    // OSRM public API — completely free, no key
    const coords = pts.map(p => `${p.lon},${p.lat}`).join(';');
    try {
      const res = await axios.get(
        `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
        { timeout: 10000 }
      );
      const geometry = res.data.routes?.[0]?.geometry?.coordinates || [];
      // OSRM returns [lon, lat] — Leaflet needs [lat, lon]
      setRoute(geometry.map(([lon, lat]) => [lat, lon]));
    } catch {
      setRoute(null);
    }
  };

  const filteredPoints = (points || []).filter(p =>
    activeType === 'waste'
      ? ['waste_disposal', 'recycling'].includes(p.type)
      : ['water_tower', 'pumping_station'].includes(p.type)
  );

  if (loading) {
    return (
      <div className="h-80 bg-gray-100 rounded-2xl flex items-center justify-center animate-pulse">
        <p className="text-gray-400 font-medium">Loading service map...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mt-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
            <h3 className="text-xl font-extrabold text-gray-900">Service Route Map</h3>
            <p className="text-sm text-gray-500 font-medium">Real-time infrastructure locations near {cityName}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveType('waste')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeType === 'waste' ? 'bg-green-600 text-white shadow-md shadow-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            🗑 Waste Route
          </button>
          <button
            onClick={() => setActiveType('water')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeType === 'water' ? 'bg-civic-500 text-white shadow-md shadow-civic-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            💧 Water Points
          </button>
        </div>
      </div>

      {filteredPoints.length === 0 ? (
        <div className="h-80 bg-gray-50 rounded-2xl flex items-center justify-center border border-dashed border-gray-200">
          <p className="text-gray-400 font-medium text-sm text-center px-8">
            No named {activeType} service points found near {cityName}.<br />
            OpenStreetMap data may be incomplete for this area.
          </p>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-inner h-[400px]">
          <MapContainer
            center={cityCoords ? [cityCoords.lat, cityCoords.lon] : [20.5937, 78.9629]}
            zoom={13}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {/* Markers for each service point */}
            {filteredPoints.map((point, i) => (
              <Marker
                key={point.id}
                position={[point.lat, point.lon]}
                icon={activeType === 'waste' ? wasteIcon : waterIcon}
              >
                <Popup className="custom-popup">
                  <div className="p-1">
                    <p className="font-bold text-gray-900 mb-0.5">{point.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{point.type.replace(/_/g, ' ')}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Route polyline from OSRM */}
            {route && route.length > 1 && (
              <Polyline
                positions={route}
                color={activeType === 'waste' ? '#16a34a' : '#2563eb'}
                weight={4}
                opacity={0.7}
                dashArray={activeType === 'waste' ? '0' : '8 4'}
              />
            )}

            <FitBounds points={filteredPoints} />
          </MapContainer>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            {filteredPoints.length} Points Found • Source: OpenStreetMap & OSRM
        </p>
        <div className="flex gap-4">
            <div className="flex items-center text-[10px] text-gray-500 font-bold">
                <div className={`w-3 h-3 rounded-full mr-1.5 ${activeType === 'waste' ? 'bg-green-500' : 'bg-civic-500'}`}></div>
                Collection Point
            </div>
            {route && (
                <div className="flex items-center text-[10px] text-gray-500 font-bold">
                    <div className={`h-0.5 w-4 mr-1.5 ${activeType === 'waste' ? 'bg-green-500' : 'bg-civic-500 border-t border-dashed border-civic-500'}`}></div>
                    Active Route
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ServiceRouteMap;
