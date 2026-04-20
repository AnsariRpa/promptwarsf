// backend/engine/simulation.js

const zones = {
  'North Gate': { crowdLevel: 0, capacity: 100 },
  'South Gate': { crowdLevel: 0, capacity: 100 },
  'East Gate': { crowdLevel: 0, capacity: 100 },
  'West Gate': { crowdLevel: 0, capacity: 100 },
  'Food Stall 1': { crowdLevel: 0, capacity: 50 },
  'Food Stall 2': { crowdLevel: 0, capacity: 50 },
  'Fan Booth': { crowdLevel: 0, capacity: 30 },
  'Parking': { crowdLevel: 0, capacity: 500 },
  'Transport': { crowdLevel: 0, capacity: 200 }
};

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
  setEventState,
  startSimulation,
  updateCrowdDensity
};
