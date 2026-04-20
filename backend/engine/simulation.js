// backend/engine/simulation.js

const zones = {
  'North Gate': { crowdLevel: 20, capacity: 200, x: 250, y: 50, type: 'gate' },
  'South Gate': { crowdLevel: 10, capacity: 200, x: 250, y: 450, type: 'gate' },
  'East Gate': { crowdLevel: 30, capacity: 200, x: 450, y: 250, type: 'gate' },
  'West Gate': { crowdLevel: 15, capacity: 200, x: 50, y: 250, type: 'gate' },
  'Food Stall 1': { crowdLevel: 10, capacity: 80, x: 150, y: 150, type: 'food' },
  'Food Stall 2': { crowdLevel: 15, capacity: 80, x: 350, y: 350, type: 'food' },
  'Med Station': { crowdLevel: 5, capacity: 50, x: 400, y: 150, type: 'aid' },
  'VIP Lounge': { crowdLevel: 12, capacity: 100, x: 250, y: 120, type: 'vip' },
  'Metro Hub': { crowdLevel: 45, capacity: 500, x: 250, y: 480, type: 'metro' },
  'Cab Pickup': { crowdLevel: 25, capacity: 150, x: 450, y: 450, type: 'cab' },
  'Fan Plaza': { crowdLevel: 60, capacity: 300, x: 420, y: 300, type: 'fanzone' },
  'Store Alpha': { crowdLevel: 20, capacity: 100, x: 80, y: 220, type: 'merch' },
  'Security 1': { crowdLevel: 0, capacity: 20, x: 200, y: 80, type: 'security' },
  'Restrooms B': { crowdLevel: 5, capacity: 40, x: 80, y: 350, type: 'restroom' }
};

// Web-like Path Network (Edges)
const pathways = [
  { from: 'North Gate', to: 'VIP Lounge' },
  { from: 'North Gate', to: 'Food Stall 1' },
  { from: 'North Gate', to: 'Security 1' },
  { from: 'West Gate', to: 'Store Alpha' },
  { from: 'West Gate', to: 'Restrooms B' },
  { from: 'South Gate', to: 'Metro Hub' },
  { from: 'South Gate', to: 'Food Stall 2' },
  { from: 'East Gate', to: 'Fan Plaza' },
  { from: 'East Gate', to: 'Med Station' },
  { from: 'VIP Lounge', to: 'Food Stall 1' },
  { from: 'Food Stall 1', to: 'Store Alpha' },
  { from: 'Fan Plaza', to: 'Med Station' },
  { from: 'Metro Hub', to: 'Cab Pickup' },
  { from: 'Cab Pickup', to: 'Food Stall 2' }
];

let eventState = 'normal'; // 'normal', 'halftime', 'exit_surge', 'entry_rush'

function updateCrowdDensity() {
  const isSpike = Math.random() > 0.8;
  
  Object.keys(zones).forEach(zone => {
    let baseCrowd = 10;
    
    if (eventState === 'entry_rush' && zone.includes('Gate')) {
        baseCrowd = 80;
    } else if (eventState === 'halftime' && (zone.includes('Food') || zone.includes('Fan'))) {
        baseCrowd = 90;
    } else if (eventState === 'exit_surge' && (zone.includes('Gate') || zone === 'Transport' || zone === 'Parking')) {
        baseCrowd = 85;
    }

    let variation = Math.floor(Math.random() * 20) - 10;
    let newLevel = baseCrowd + variation;

    if (isSpike && zone === 'East Gate') {
        newLevel += 40;
    }

    zones[zone].crowdLevel = Math.max(0, Math.min(100, newLevel));
  });
}

function getZones() {
  return zones;
}

function getPathways() {
  return pathways;
}

function setEventState(state) {
    if (['normal', 'halftime', 'exit_surge', 'entry_rush'].includes(state)) {
        eventState = state;
        updateCrowdDensity();
    }
}

function startSimulation(intervalMs = 5000) {
  setInterval(updateCrowdDensity, intervalMs);
}

module.exports = {
  getZones,
  getPathways,
  setEventState,
  startSimulation,
  updateCrowdDensity
};
