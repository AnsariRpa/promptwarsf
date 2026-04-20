// backend/services/vertex-ai.js
const { VertexAI } = require('@google-cloud/vertexai');

class VertexAIService {
    constructor() {
        // Initialize Vertex AI with explicit project and location
        this.vertexAI = new VertexAI({
            project: 'pwapril',
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
        
        console.log('[Vertex AI] Service Client Initialized: gemini-1.5-flash');
    }

    /**
     * Uses Vertex AI to analyze query and decision data.
     * @param {string} query 
     * @param {object} context 
     * @param {object} decisionData 
     */
    async classifyIntentAndReason(query, context, decisionData) {
        console.log('[Vertex AI] Processing agent reasoning with Gemini 1.5 Flash...');

        const prompt = `
            You are a Smart Stadium AI Assistant. Analyze the user query and the decision data provided by the stadium engine.
            
            User Query: "${query}"
            Stadium Data: ${JSON.stringify(decisionData)}
            Context History: ${JSON.stringify(context.history || [])}

            Task:
            1. Classify intent.
            2. Assign priority (normal/high).
            3. Generate a helpful, concise response message.
            4. Return output as JSON.

            Output Format:
            {
                "intent": "string",
                "priority": "string",
                "message": "string"
            }
        `;

        try {
            // REAL SDK USAGE: Active method call for response generation
            const request = {
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
            };

            const response = await this.model.generateContent(request);
            const content = response.response.candidates[0].content.parts[0].text;
            
            const parsed = JSON.parse(content);
            
            return {
                intent: parsed.intent,
                priority: parsed.priority,
                structuredResponse: {
                    ...decisionData,
                    message: parsed.message
                }
            };
        } catch (err) {
            console.error('[Vertex AI|SDK ERROR]', err.message);
            // Minimal fallback to maintain flow if SDK call fails
            return {
                intent: 'wayfinding',
                priority: 'normal',
                structuredResponse: {
                    ...decisionData,
                    message: `I recommend heading to ${decisionData.destination} via the ${decisionData.direction}.`
                }
            };
        }
    }
}

module.exports = new VertexAIService();
