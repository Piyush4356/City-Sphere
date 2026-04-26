const mongoose = require('mongoose');
const CityService = require('./models/CityService');
require('dotenv').config();

const data = [
  { cityName: 'Dehradun', waste: { days: 'Daily (Mon-Sat)', time: '07:00 AM', zones: 4, notes: 'Separate bins for dry and wet waste' }, water: { timing: '06:00 AM - 09:00 AM & 05:00 PM - 07:00 PM', frequency: 'Daily', notes: 'Jal Sansthan managed' } },
  { cityName: 'Delhi', waste: { days: 'Daily', time: '06:30 AM', zones: 12, notes: 'MCD door-to-door collection' }, water: { timing: '05:30 AM - 09:30 AM', frequency: 'Daily', notes: 'Delhi Jal Board' } },
  { cityName: 'Mumbai', waste: { days: 'Daily', time: '07:00 AM', zones: 24, notes: 'BMC collection — segregate at source' }, water: { timing: '06:00 AM - 10:00 AM', frequency: 'Daily', notes: 'MCGM supply' } },
  { cityName: 'Bangalore', waste: { days: 'Daily', time: '07:30 AM', zones: 18, notes: 'BBMP door-to-door — dry/wet segregation mandatory' }, water: { timing: '06:00 AM - 09:00 AM & 04:00 PM - 06:00 PM', frequency: 'Daily', notes: 'BWSSB supply' } },
  { cityName: 'Pune', waste: { days: 'Daily (Mon-Sat)', time: '07:00 AM', zones: 15, notes: 'PMC segregation required' }, water: { timing: '07:00 AM - 10:00 AM', frequency: 'Daily', notes: 'PMC water department' } },
  { cityName: 'Jaipur', waste: { days: 'Mon / Wed / Fri / Sun', time: '07:00 AM', zones: 8, notes: 'JMC collection' }, water: { timing: '06:00 AM - 09:00 AM', frequency: 'Daily', notes: 'PHED supply' } },
  { cityName: 'Hyderabad', waste: { days: 'Daily', time: '06:00 AM', zones: 16, notes: 'GHMC collection' }, water: { timing: '05:30 AM - 08:30 AM', frequency: 'Daily', notes: 'HMWS&SB' } },
  { cityName: 'Chennai', waste: { days: 'Daily', time: '07:00 AM', zones: 20, notes: 'GCC door-to-door' }, water: { timing: '06:30 AM - 09:30 AM', frequency: 'Alternate days', notes: 'Metrowater' } },
  { cityName: 'Kolkata', waste: { days: 'Daily', time: '07:00 AM', zones: 14, notes: 'KMC collection' }, water: { timing: '05:00 AM - 08:00 AM & 05:00 PM - 07:00 PM', frequency: 'Daily', notes: 'KMC water supply' } },
  { cityName: 'Ahmedabad', waste: { days: 'Daily', time: '07:30 AM', zones: 10, notes: 'AMC collection' }, water: { timing: '06:00 AM - 09:00 AM', frequency: 'Daily', notes: 'AMC water department' } },
];

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  await CityService.deleteMany({});
  await CityService.insertMany(data);
  console.log('Seeded city services');
  process.exit(0);
}).catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
});
