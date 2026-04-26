const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: '5mb' }));
app.use(cors());

// Route imports
const authRoutes = require('./routes/authRoutes');
const serviceScheduleRoutes = require('./routes/serviceScheduleRoutes');
const placeRoutes = require('./routes/placeRoutes');
const placeSuggestionRoutes = require('./routes/placeSuggestionRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');

// Route mounting
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceScheduleRoutes);
app.use('/api/places', placeRoutes);
app.use('/api/suggestions', placeSuggestionRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/feedback', feedbackRoutes);

app.get('/', (req, res) => {
    res.send('Smart City Portal API is running...');
});

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log('Mongo Error:', err));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
