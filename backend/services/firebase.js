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

    // Fallback for real-time crowd data
    async getRealtimeCrowdData() {
        return require('../engine/simulation').getZones();
    }

    /**
     * Retrieve the last few logs from Firestore for the dashboard.
     * @param {number} limit 
     */
    async getRecentLogs(limit = 5) {
        console.log(`[Firebase] Fetching last ${limit} interactions...`);
        try {
            const snapshot = await this.db.collection('agent_logs')
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp ? doc.data().timestamp.toDate() : new Date()
            }));
        } catch (err) {
            console.error('[Firebase|SDK ERROR] Failed to fetch logs:', err.message);
            return [];
        }
    }
}

module.exports = new FirebaseService();
