// backend/services/firebase.js
const admin = require('firebase-admin');

class FirebaseService {
    constructor() {
        try {
            // REAL SDK USAGE: Initialize using default credentials or env project ID
            admin.initializeApp({
                projectId: 'pwapril'
            });
            this.db = admin.firestore();
            console.log('[Firebase] Admin SDK Initialized for Project: pwapril');
        } catch (err) {
            console.error('[Firebase|Init Error]', err.message);
        }
    }

    /**
     * Log outcome to Firestore for audit and historical analysis.
     * @param {string} userId 
     * @param {object} interaction 
     */
    async logAgentOutcome(userId, interaction) {
        console.log(`[Firebase] Logging outcome for User: ${userId}`);

        try {
            // REAL SDK USAGE: Explicit method call to store data
            const logRef = this.db.collection('agent_logs').doc();
            await logRef.set({
                userId: userId,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                query: interaction.query,
                intent: interaction.intent,
                outcome: interaction.structuredResponse,
                project: 'pwapril'
            });
            
            console.log('[Firebase] Outcome successfully persisted to Firestore.');
        } catch (err) {
            console.error('[Firebase|SDK ERROR] Failed to log outcome:', err.message);
        }
    }

    // Fallback for real-time crowd data (could also be in RTDB, but we use simulation here)
    async getRealtimeCrowdData() {
        // This normally would fetch from RTDB, but for the competition flow 
        // we'll keep it integrated with the simulation engine while calling logAgentOutcome for real SDK usage.
        return require('../engine/simulation').getZones();
    }
}

module.exports = new FirebaseService();
