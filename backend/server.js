const express = require('express');
const cors = require('cors');

const app = express();

console.log("🚀 Booting Stadium AI Backend...");

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
    res.send('OK');
});

// Try loading API routes safely
try {
    const apiRoutes = require('./routes/api');
    app.use('/api', apiRoutes);
    console.log("✅ API routes loaded");
} catch (err) {
    console.error("❌ API load failed:", err.message);
}

// Fallback API (so Cloud Run doesn't break)
app.get('/api/test', (req, res) => {
    res.json({ status: "API working" });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
});