// backend/services/vertex-ai.js
const { VertexAI } = require('@google-cloud/vertexai');

class VertexAIService {
    constructor() {
        // Initialize Vertex AI with explicit project and location
        const project = process.env.GOOGLE_CLOUD_PROJECT || 'pwapril';
        this.vertexAI = new VertexAI({
            project: project,
            location: 'us-central1'
        });
        
        // Initialize the Generative Model
        this.model = this.vertexAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: {
                maxOutputTokens: 1024,
                temperature: 0.2,
                responseMimeType: 'application/json'
            }
        });
        
        console.log(`[Vertex AI] Service Client Initialized: gemini-1.5-flash (Project: ${project})`);
    }

    /**
     * Local Deterministic Fallback: Keyword/Regex matching
     * Enhances mapping for common synonyms and location types.
     */
    localExtractionFallback(query, nodes) {
        console.log('[Vertex AI] Using local NLU fallback matching...');
        const q = query.toLowerCase();
        let current_location = null;
        let destination = null;
        let intent = 'wayfinding';

        // Normalized Mapping Dict for non-exact matches
        const synonyms = {
            'med station': 'Med Station',
            'medical': 'Med Station',
            'first aid': 'Med Station',
            'doctor': 'Med Station',
            'hungry': 'Food Stall 1',
            'food': 'Food Stall 1',
            'eat': 'Food Stall 1',
            'merch': 'Store Alpha',
            'shop': 'Store Alpha'
        };

        // Match Exact/Fuzzy Nodes
        nodes.forEach(node => {
            if (q.includes(node.toLowerCase())) {
                const isGate = node.toLowerCase().includes('gate');
                // Heuristic: If it's a gate and we don't have a start, it's likely a start point
                if (isGate && !current_location) current_location = node;
                else if (!destination) destination = node;
            }
        });

        // Apply synonym mapping if still missing
        Object.keys(synonyms).forEach(syn => {
            if (q.includes(syn) && !destination) {
                destination = synonyms[syn];
                if (syn === 'medical' || syn === 'med station' || syn === 'aid') intent = 'emergency';
                else if (syn === 'food' || syn === 'hungry' || syn === 'eat') intent = 'food';
            }
        });

        // Refine with "to" / "from"
        if (q.includes('from')) {
            const afterFrom = q.split('from')[1];
            const matched = nodes.find(n => afterFrom.includes(n.toLowerCase()));
            if (matched) current_location = matched;
        }
        if (q.includes('to')) {
            const afterTo = q.split('to')[1];
            const matched = nodes.find(n => afterTo.includes(n.toLowerCase()));
            if (matched) destination = matched;
        }

        return { current_location, destination, intent };
    }

    /**
     * Helper to clean AI response for JSON parsing
     */
    _cleanJsonResponse(text) {
        return text.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    /**
     * Phase 1: Pure Meta-data Extraction
     * Identifies current_location and destination without generating a final answer.
     */
    async extractMetadata(query, nodes, history = []) {
        console.log('[Vertex AI] Phase 1 - Extracting metadata from query...');

        const prompt = `
            You are a Stadium NLU extraction engine. 
            User Query: "${query}"
            Valid Nodes: ${JSON.stringify(nodes)}
            
            Task:
            1. Identify the "current_location" (the starting point). It MUST be exactly one of the Valid Nodes.
            2. Identify the "destination". It MUST be exactly one of the Valid Nodes.
            3. Classify "intent" (wayfinding, emergency, food, exit).

            Normalization Rules:
            - "med station", "medical", "first aid" -> "Med Station"
            - "food", "hungry", "eat" -> "Food Stall 1" (or nearest stall)
            - If "to" or "from" are used, follow them strictly.

            Return ONLY JSON:
            {
                "current_location": "string | null",
                "destination": "string | null",
                "intent": "string"
            }
        `;

        try {
            const request = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
            const response = await this.model.generateContent(request);
            const content = response.response.candidates[0].content.parts[0].text;
            return JSON.parse(this._cleanJsonResponse(content));
        } catch (err) {
            console.error('[Vertex AI|Extraction Error]', err.message);
            return this.localExtractionFallback(query, nodes);
        }
    }

    /**
     * Phase 2: Natural Language Explanation
     * Takes deterministic route data and formats it for the user.
     */
    async generateResponse(query, routeData) {
        console.log('[Vertex AI] Phase 2 - Generating natural language reasoning...');

        const prompt = `
            You are a helpful Smart Stadium AI Assistant. 
            Explain this navigation route to the user in a friendly, conversational way.

            User Query: "${query}"
            Route Details: ${JSON.stringify(routeData)}

            Rules:
            1. Use the EXACT distance and path name provided in the route details.
            2. Do NOT change the start or destination nodes.
            3. Mention any congestion or context provided.

            Return ONLY JSON:
            {
                "message": "string",
                "priority": "normal | high"
            }
        `;

        try {
            const request = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
            const response = await this.model.generateContent(request);
            const content = response.response.candidates[0].content.parts[0].text;
            return JSON.parse(this._cleanJsonResponse(content));
        } catch (err) {
            console.error('[Vertex AI|Response Error]', err.message);
            // FAILOVER TO TEMPLATE-BASED REASONING
            const msg = `Navigating from ${routeData.startNode} to ${routeData.destination} via ${routeData.pathName}. The estimated distance is ${routeData.distance}.`;
            return {
                message: msg,
                priority: routeData.crowdLevel > 70 ? 'high' : 'normal'
            };
        }
    }
}

module.exports = new VertexAIService();
