// backend/engine/context.js

class ContextBuilder {
    constructor() {
        // Simple in-memory session store
        this.sessions = {};
    }

    getSession(userId) {
        if (!this.sessions[userId]) {
            this.sessions[userId] = {
                history: [],
                preferences: { routeStrategy: 'shortest' }, // 'shortest' or 'least_crowded'
                currentLocation: 'Center Field' // Default simulator starting point
            };
        }
        return this.sessions[userId];
    }

    updatePreference(userId, key, value) {
        const session = this.getSession(userId);
        session.preferences[key] = value;
    }

    updateLocation(userId, location) {
        const session = this.getSession(userId);
        session.currentLocation = location;
    }

    addHistory(userId, interaction) {
        const session = this.getSession(userId);
        session.history.push(interaction);
        if (session.history.length > 10) {
            session.history.shift(); // Keep last 10
        }
    }
}

module.exports = new ContextBuilder();
