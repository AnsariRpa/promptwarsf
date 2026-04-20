// backend/services/orchestrator.js
const contextBuilder = require('../engine/context');
const firebaseService = require('./firebase');
const bigQueryService = require('./bigquery');
const decisionEngine = require('../engine/decision');
const vertexAIService = require('./vertex-ai');

class Orchestrator {
    constructor() {
        console.log('[Orchestrator] Service initialized with Google Cloud Integration.');
    }

    /**
     * Main agent flow: User Input -> NLU -> Validation -> Routing -> Explanation -> Feedback
     */
    async processUserQuery(userId, query) {
        console.log(`[Orchestrator] Processing query for User: ${userId} -> "${query}"`);
        
        try {
            // 1. Context Builder: Retrieve session state & history
            const session = contextBuilder.getSession(userId);
            contextBuilder.addHistory(userId, { role: 'user', content: query });

            // 2. Data Gathering: Real-time from Simulation
            const crowdData = await firebaseService.getRealtimeCrowdData();
            const nodeNames = Object.keys(crowdData);

            // 3. PHASE 1: NLU Meta-data Extraction (Stricter Constraints)
            const metadata = await vertexAIService.extractMetadata(query, nodeNames, session.history);
            
            const startNode = metadata.current_location;
            const destNode = metadata.destination;

            // 4. PHASE 2: Deterministic Validation Layer
            // Critical Fix: DO NOT proceed if start is Unknown.
            if (!startNode || !crowdData[startNode]) {
                const errorMsg = "I need to know your current location to provide accurate directions. Please specify where you are (e.g., 'I am at West Gate').";
                contextBuilder.addHistory(userId, { role: 'assistant', content: errorMsg });
                return {
                    intent: 'clarification',
                    priority: 'high',
                    currentLocation: null,
                    destination: destNode,
                    structuredResponse: {
                        message: errorMsg,
                        status: 'error',
                        errorType: 'LOCATION_REQUIRED'
                    }
                };
            }

            // Update session with detected location
            contextBuilder.updateLocation(userId, startNode);

            // 5. PHASE 3: Deterministic Routing (Decision Engine)
            let bqData = null;
            try {
                bqData = await bigQueryService.getHistoricalPattern(startNode, metadata.intent || 'wayfinding');
            } catch (err) { console.error('[Orchestrator] BigQuery Fetch Error'); }

            const routeDetails = decisionEngine.decideRoute(
                metadata.intent, 
                crowdData, 
                session, 
                bqData,
                startNode,
                destNode
            );

            if (routeDetails.error) {
                return {
                    intent: metadata.intent,
                    priority: 'normal',
                    currentLocation: startNode,
                    structuredResponse: {
                        message: routeDetails.message,
                        status: 'error'
                    }
                };
            }

            // 6. PHASE 4: Final Narrative Explainer (AI Assist)
            // AI is used only to beautify the DETERMINISTIC route
            const reasoning = await vertexAIService.generateResponse(query, routeDetails);

            // 7. PERSISTENCE
            await firebaseService.logAgentOutcome(userId, {
                query,
                intent: metadata.intent,
                structuredResponse: { ...routeDetails, message: reasoning.message }
            });

            console.log(`[Orchestrator] Final Response synchronized. ${startNode} -> ${routeDetails.destination}`);
            
            contextBuilder.addHistory(userId, { role: 'assistant', content: reasoning.message });

            return {
                intent: metadata.intent,
                priority: reasoning.priority,
                currentLocation: startNode,
                destination: routeDetails.destination,
                structuredResponse: {
                    ...routeDetails,
                    message: reasoning.message
                },
                bqData: bqData,
                timestamp: new Date().toISOString()
            };

        } catch (err) {
            console.error(`[Orchestrator|CORE ERROR]`, err);
            return {
                intent: 'error',
                priority: 'normal',
                structuredResponse: {
                    destination: 'Help Desk',
                    direction: 'Central Paths',
                    message: `System error occurred. Please proceed to the nearest steward or Help Desk.`
                }
            };
        }
    }
}

module.exports = new Orchestrator();
