// backend/routes/api.js
const express = require('express');
const router = express.Router();
const orchestrator = require('../services/orchestrator');
const simulationEngine = require('../engine/simulation');

// User query endpoint
router.post('/query', async (req, res) => {
    const { userId, query } = req.body;
    
    if (!userId || !query) {
        return res.status(400).json({ error: 'Missing userId or query' });
    }

    try {
        const response = await orchestrator.processUserQuery(userId, query);
        res.json(response);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin endpoint to change stadium state
router.post('/admin/state', (req, res) => {
    const { state } = req.body;
    simulationEngine.setEventState(state);
    res.json({ status: 'success', newState: state });
});

// View current simulation state
router.get('/simulation', (req, res) => {
    res.json(simulationEngine.getZones());
});

module.exports = router;
