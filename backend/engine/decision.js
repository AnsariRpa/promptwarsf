// backend/engine/decision.js

class DecisionEngine {
    constructor() {
        console.log('[Decision Engine] Initialized rule-based logic.');
    }

    /**
     * Determines the best destination and route based on parameters.
     */
    decideRoute(intent, crowdData, userSession, bqData, detectedStart = null, detectedDest = null) {
        console.log(`[Decision Engine] Calculating route: ${detectedStart || 'Auto'} -> ${detectedDest || intent}`);
        
        const validNodes = Object.keys(crowdData);
        
        // 1. Resolve Start Node exactly
        const startNodeName = detectedStart || userSession.currentLocation;
        const startNode = crowdData[startNodeName];

        if (!startNode) {
            return { error: 'START_NODE_MISSING', message: 'Current location is unknown. Please specify where you are (e.g., North Gate).' };
        }
        
        // 2. Resolve Destination Node
        let finalDestName = detectedDest;
        
        // If destination not detected, use intent-based nearest facility logic
        if (!finalDestName || !crowdData[finalDestName]) {
            finalDestName = this._findNearestFacility(startNode, crowdData, intent);
        }

        const endNode = crowdData[finalDestName];
        if (!endNode) {
            return { error: 'DESTINATION_NOT_FOUND', message: 'I couldn\'t find a valid destination for your request.' };
        }

        // 3. Calculate Distance (Euclidean * scale)
        const dx = endNode.x - startNode.x;
        const dy = endNode.y - startNode.y;
        const distance = Math.round(Math.sqrt(dx * dx + dy * dy) * 1.2); // 1.2 scale factor for meters
        const pathName = this._determinePathName(startNodeName, finalDestName);

        // 4. Logic: Congestion Check
        const currentCrowd = endNode.crowdLevel;
        let justification = `Route from ${startNodeName} to ${finalDestName} via ${pathName} is clear.`;
        
        if (currentCrowd > 80) {
            justification = `The destination ${finalDestName} is currently very crowded (${currentCrowd}%). I suggest waiting or checking alternative spots.`;
        } else if (currentCrowd > 50) {
            justification = `The ${finalDestName} has moderate traffic.`;
        }

        if (bqData && bqData.congestionLevel === 'High') {
            justification += ` Note: Historical trends show high activity in this zone at this time.`;
        }

        return {
            startNode: startNodeName,
            destination: finalDestName,
            distance: `${distance}m`,
            pathName: pathName,
            crowdLevel: currentCrowd,
            justification: justification,
            direction: `${pathName} -> ${finalDestName}`,
            status: 'success'
        };
    }

    _findNearestFacility(startNode, crowdData, intent) {
        let targetType = 'gate';
        if (intent === 'food') targetType = 'food';
        else if (intent === 'emergency' || intent === 'aid') targetType = 'aid';
        else if (intent === 'exit') targetType = 'gate';
        else if (intent === 'merch') targetType = 'merch';

        let nearest = null;
        let minDist = Infinity;

        Object.entries(crowdData).forEach(([name, node]) => {
            if (node.type === targetType && name !== 'North Gate') { // Exclude generic if specific requested
                const dx = node.x - startNode.x;
                const dy = node.y - startNode.y;
                const d = dx * dx + dy * dy;
                if (d < minDist) {
                    minDist = d;
                    nearest = name;
                }
            }
        });

        return nearest || 'Fan Plaza'; // Fallback to Fan Plaza if nothing found
    }

    _determinePathName(start, end) {
        if (start.includes('Gate') && end.includes('Gate')) return 'Outer Perimeter Road';
        if (start.includes('North') || end.includes('North')) return 'North Skyway';
        if (start.includes('South') || end.includes('South')) return 'South Link';
        if (start.includes('East') || end.includes('East')) return 'East Gallery';
        if (start.includes('West') || end.includes('West')) return 'West Corridor';
        return 'Central Promenade';
    }
}

module.exports = new DecisionEngine();
