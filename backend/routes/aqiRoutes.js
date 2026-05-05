const express = require('express');
const axios = require('axios');
const AqiRecord = require('../models/AqiRecord');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

const aqiDetails = {
    1: { value: 25, category: 'Good', color: 'green', message: 'Enjoy outdoor activities 😊' },
    2: { value: 75, category: 'Moderate', color: 'yellow', message: 'Air quality is moderate. Stay aware.' },
    3: { value: 150, category: 'Poor', color: 'orange', message: 'Avoid long outdoor exposure 😷' },
    4: { value: 250, category: 'Very Poor', color: 'red', message: 'Limit outdoor activities 🚫' },
    5: { value: 350, category: 'Hazardous', color: 'black', message: 'Stay indoors and keep windows closed ⚫' },
};

function toAqiData(index) {
    return aqiDetails[index] || aqiDetails[3];
}

function formatLocation(lat, lon) {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

router.get('/aqi', authenticateToken, async (req, res) => {
    try {
        const lat = parseFloat(req.query.lat);
        const lon = parseFloat(req.query.lon);
        if (Number.isNaN(lat) || Number.isNaN(lon)) {
            return res.status(400).json({ error: 'Latitude and longitude are required.' });
        }

        let aqiResponse;
        if (!OPENWEATHER_API_KEY) {
            console.warn('OPENWEATHER_API_KEY is missing. Using fallback AQI values.');
            aqiResponse = { list: [{ main: { aqi: 2 }, components: {} }] };
        } else {
            try {
                const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`;
                const apiRes = await axios.get(url, { timeout: 10000 }); // 10 second timeout
                aqiResponse = apiRes.data;
            } catch (apiError) {
                console.warn('OpenWeatherMap API failed, using fallback AQI values:', apiError.message);
                aqiResponse = { list: [{ main: { aqi: 2 }, components: {} }] };
            }
        }

        const openAqi = aqiResponse.list?.[0]?.main?.aqi || 2;
        const components = aqiResponse.list?.[0]?.components || {};
        const detail = toAqiData(openAqi);

        const record = await AqiRecord.create({
            user: req.user.id,
            lat,
            lng: lon,
            location: formatLocation(lat, lon),
            aqi: detail.value,
            aqiIndex: openAqi,
            category: detail.category,
            status: detail.category,
            suggestion: detail.message,
            components: {
                co: components.co,
                no: components.no,
                no2: components.no2,
                o3: components.o3,
                so2: components.so2,
                pm2_5: components.pm2_5,
                pm10: components.pm10,
                nh3: components.nh3,
            },
        });

        res.json({
            aqi: detail.value,
            index: openAqi,
            category: detail.category,
            color: detail.color,
            suggestion: detail.message,
            location: record.location,
            components: record.components,
            record,
        });
    } catch (error) {
        console.error('AQI fetch error:', error.message);
        res.status(500).json({ error: 'Failed to fetch AQI data' });
    }
});

router.get('/weather', authenticateToken, async (req, res) => {
    try {
        const lat = parseFloat(req.query.lat);
        const lon = parseFloat(req.query.lon);
        if (Number.isNaN(lat) || Number.isNaN(lon)) {
            return res.status(400).json({ error: 'Latitude and longitude are required.' });
        }

        let weatherData;
        if (!OPENWEATHER_API_KEY) {
            weatherData = {
                main: { temp: 28, humidity: 60 },
                weather: [{ main: 'Clear', description: 'sunny skies' }],
                rain: { '1h': 0 },
                wind: { speed: 4.5 }
            };
        } else {
            try {
                const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;
                const response = await axios.get(url, { timeout: 10000 }); // 10 second timeout
                weatherData = response.data;
            } catch (apiError) {
                console.warn('OpenWeatherMap weather API failed, using fallback values:', apiError.message);
                weatherData = {
                    main: { temp: 28, humidity: 60 },
                    weather: [{ main: 'Clear', description: 'sunny skies' }],
                    rain: { '1h': 0 },
                    wind: { speed: 4.5 }
                };
            }
        }

        const rainVolume = weatherData.rain?.['1h'] || 0;
        const rainAlert = rainVolume > 0 ? `Rain expected (${rainVolume} mm in last hour). Carry an umbrella.` : 'No rain expected in the next hour.';
        const weather = weatherData.weather?.[0] || { main: 'Unknown', description: '' };

        res.json({
            temperature: weatherData.main?.temp || 0,
            humidity: weatherData.main?.humidity || 0,
            condition: weather.main,
            description: weather.description,
            windSpeed: weatherData.wind?.speed || 0,
            rainVolume,
            rainAlert,
        });
    } catch (error) {
        console.error('Weather fetch error:', error.message);
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

router.get('/aqi/history', authenticateToken, async (req, res) => {
    try {
        const records = await AqiRecord.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(7)
            .lean();

        res.json({ records: records.reverse() });
    } catch (error) {
        console.error('AQI history error:', error);
        res.status(500).json({ error: 'Failed to fetch AQI history' });
    }
});

router.get('/aqi/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const total = await AqiRecord.countDocuments();
        const summary = await AqiRecord.aggregate([
            { $group: { _id: null, avgAqi: { $avg: '$aqi' }, maxAqi: { $max: '$aqi' }, minAqi: { $min: '$aqi' } } }
        ]);
        const worst = await AqiRecord.findOne().sort({ aqi: -1 }).limit(1).lean();
        const categoryCounts = await AqiRecord.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
        ]);

        res.json({
            total,
            averageAqi: summary[0]?.avgAqi ? Math.round(summary[0].avgAqi) : 0,
            maxAqi: summary[0]?.maxAqi || 0,
            minAqi: summary[0]?.minAqi || 0,
            worstLocation: worst?.location || 'N/A',
            categoryCounts,
        });
    } catch (error) {
        console.error('AQI admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch AQI admin stats' });
    }
});

module.exports = router;
