const mongoose = require('mongoose');
require('dotenv').config();
const Feedback = require('./models/Feedback');
const User = require('./models/User');

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Verify all existing feedback
        const verifyRes = await Feedback.updateMany({}, { $set: { isVerified: true } });
        console.log(`Verified ${verifyRes.modifiedCount} existing reports.`);

        // 2. Create/Find specific mock users
        const mockUsers = [
            { name: 'Pratik', email: 'pratik@citysphere.com', password: 'password123' },
            { name: 'Aryan', email: 'aryan@citysphere.com', password: 'password123' }
        ];

        const users = [];
        for (const mu of mockUsers) {
            let u = await User.findOne({ email: mu.email });
            if (!u) {
                u = await User.create(mu);
                console.log(`Created user: ${mu.name}`);
            }
            users.push(u);
        }

        const pratik = users[0];
        const aryan = users[1];

        // We'll add for "Dehradun"
        const city = "Dehradun";

        const mocks = [
            {
                user: pratik._id,
                cityName: city,
                type: 'experience',
                category: 'other',
                content: 'The evening view from the Clock Tower is absolutely stunning! The new lighting makes the city look magical.',
                rating: 5,
                isVerified: true
            },
            {
                user: aryan._id,
                cityName: city,
                type: 'experience',
                category: 'other',
                content: 'Had a great morning walk at Gandhi Park. Well maintained and very peaceful.',
                rating: 4,
                isVerified: true
            },
            {
                user: pratik._id,
                cityName: city,
                type: 'suggestion',
                category: 'transport',
                content: 'We should implement a smart cycle-sharing system near the main bus stands to reduce short-distance traffic.',
                starCount: 12,
                stars: [aryan._id],
                isVerified: true
            },
            {
                user: aryan._id,
                cityName: city,
                type: 'suggestion',
                category: 'waste',
                content: 'Installing smart bins that notify the collection trucks when full would greatly improve efficiency.',
                starCount: 8,
                stars: [pratik._id],
                isVerified: true
            }
        ];

        for (const m of mocks) {
            // Remove existing to refresh user association
            await Feedback.deleteMany({ content: m.content });
            await Feedback.create(m);
            console.log(`Created mock: ${m.type} for ${m.user === pratik._id ? 'Pratik' : 'Aryan'}`);
        }

        console.log('Seeding completed!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seed();
