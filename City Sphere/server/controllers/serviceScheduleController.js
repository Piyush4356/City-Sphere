const CityService = require('../models/CityService');
const axios = require('axios');

// Regional defaults if city not in DB
const REGIONAL_DEFAULTS = {
  default: {
    waste: { days: 'Mon / Wed / Fri', time: '07:00 AM', zones: 3, notes: 'Contact local municipality for exact schedule' },
    water: { timing: '06:00 AM - 09:00 AM', frequency: 'Daily', notes: 'Contact local water board' }
  }
};

// GET /api/services/schedule/:cityName
exports.getCitySchedule = async (req, res) => {
  try {
    const cityName = req.params.cityName?.trim();
    if (!cityName) return res.status(400).json({ message: 'City name required' });

    // Case-insensitive search
    let service = await CityService.findOne({
      cityName: { $regex: new RegExp(`^${cityName}$`, 'i') }
    });

    if (!service) {
      // Return regional default with a flag
      return res.json({
        ...REGIONAL_DEFAULTS.default,
        cityName,
        isDefault: true,
        message: `No specific schedule found for ${cityName}. Showing regional defaults.`
      });
    }

    res.json({ ...service.toObject(), isDefault: false });
  } catch (err) {
    console.error('Schedule fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/services/points/:cityName
// Fetches waste bins + water points near the city from Overpass
exports.getCityServicePoints = async (req, res) => {
  try {
    const cityName = req.params.cityName?.trim();
    
    // First geocode the city to get coordinates
    const geoRes = await axios.get(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`,
      { 
        headers: { 'User-Agent': 'CitySphere/1.0 (piyushsharma1628@gmail.com)' },
        timeout: 5000 
      }
    );
    
    if (!geoRes.data?.length) {
      return res.status(404).json({ message: 'City not found' });
    }
    
    const { lat, lon } = geoRes.data[0];

    // Overpass query for waste bins + water infrastructure
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="waste_disposal"]["name"](around:8000,${lat},${lon});
        node["amenity"="recycling"]["name"](around:8000,${lat},${lon});
        node["man_made"="water_tower"]["name"](around:10000,${lat},${lon});
        node["man_made"="pumping_station"]["name"](around:10000,${lat},${lon});
      );
      out 15;
    `;

    const overpassRes = await axios.post(
      'https://overpass-api.de/api/interpreter',
      query,
      { 
        headers: { 
          'Content-Type': 'text/plain',
          'User-Agent': 'CitySphere/1.0 (piyushsharma1628@gmail.com)'
        }, 
        timeout: 30000 
      }
    );

    const elements = overpassRes.data.elements || [];

    const points = elements.map(el => ({
      id: String(el.id),
      name: el.tags?.name || 'Service Point',
      lat: el.lat,
      lon: el.lon,
      type: el.tags?.amenity || el.tags?.man_made || 'service'
    }));

    res.json({ cityCoords: { lat: parseFloat(lat), lon: parseFloat(lon) }, points });
  } catch (err) {
    console.error('Service points error:', err);
    res.status(500).json({ message: 'Error fetching service points' });
  }
};
