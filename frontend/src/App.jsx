import React, { useState, useEffect, useRef, useMemo } from 'react';
import './Dashboard.css';
const API_BASE = import.meta.env.VITE_API_URL;

/**
 * Typewriter Effect Hook - Smooth character streaming
 */
const useTypewriter = (text, speed = 20, active = true) => {
  const [displayText, setDisplayText] = useState('');
  useEffect(() => {
    if (!active || !text) return;
    setDisplayText('');
    let i = 0;
    const interval = setInterval(() => {
      setDisplayText((prev) => prev + text.charAt(i));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, active]);
  return displayText;
};

/**
 * Interactive SVG Map Engine
 * Supports Mouse Zoom/Pan and UI control buttons
 */
const MapEngine = ({ zones, pathways, recommendedPath, activeLayers, zoom, pan, onPan, onZoom }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;
    onPan(dx, dy);
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div
      className="map-viewport"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="scanline"></div>
      <div className="map-svg-container" style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}>
        <svg viewBox="0 0 500 500" aria-label="Stadium Operational HUD Map">
          <defs>
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Stadium Architecture Rings */}
          <circle cx="250" cy="250" r="235" fill="none" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="5 5" />
          <circle cx="250" cy="250" r="200" fill="rgba(0, 242, 255, 0.03)" stroke="var(--border)" strokeWidth="2" />
          <circle cx="250" cy="250" r="160" fill="none" stroke="var(--border)" strokeWidth="1" />

          {/* Pitch Area */}
          <rect x="185" y="215" width="130" height="70" fill="rgba(15, 23, 42, 0.8)" stroke="var(--border)" strokeWidth="1" rx="4" />

          {/* Connected Web-like Pathway Network */}
          <g className="paths" stroke="rgba(0, 242, 255, 0.15)" strokeWidth="1.5" fill="none">
            {pathways.map((path, idx) => {
              const start = zones[path.from];
              const end = zones[path.to];
              if (!start || !end) return null;
              return (
                <path
                  key={`path-${idx}`}
                  d={`M ${start.x},${start.y} Q 250,250 ${end.x},${end.y}`}
                  className="base-path"
                />
              );
            })}
          </g>

          {/* Normalized Heatmap Overlay (Normalized Percentage of Capacity) */}
          {activeLayers.data && Object.entries(zones).map(([name, z]) => {
            const density = (z.crowdLevel / z.capacity) * 100;
            const color = density > 75 ? 'var(--neon-red)' : density > 50 ? 'var(--neon-purple)' : 'var(--neon-blue)';
            return (
              <g key={`heat-${name}`}>
                <circle
                  cx={z.x} cy={z.y}
                  r={density / 4 + 10}
                  className="heatmap-pulse"
                  fill={color}
                  style={{ opacity: 0.35, filter: 'blur(12px)' }}
                />
                {density > 60 && (
                  <text x={z.x} y={z.y - 12} fontSize="7" fill={color} textAnchor="middle" fontStyle="italic">
                    DENSITY: {Math.round(density)}%
                  </text>
                )}
              </g>
            );
          })}

          {/* AI Recommended Particle Flow Route */}
          {recommendedPath && (
            <g filter="url(#neonGlow)">
              <path
                d={recommendedPath}
                fill="none"
                stroke="var(--neon-blue)"
                strokeWidth="4"
                className="route-particle"
              />
              {(() => {
                const parts = recommendedPath.replace(/M|L/g, '').trim().split(/\s+/);
                const start = parts[0]?.split(',');
                const end = parts[1]?.split(',');
                if (!start || !end) return null;
                return (
                  <>
                    <circle cx={start[0]} cy={start[1]} r="6" fill="var(--neon-blue)" />
                    <circle cx={end[0]} cy={end[1]} r="8" fill="var(--neon-green)" />
                  </>
                );
              })()}
            </g>
          )}

          {/* Facility Layer Markers (with Toggles) */}
          {Object.entries(zones).filter(([_, z]) => activeLayers[z.type]).map(([name, z]) => (
            <g key={name} className="marker" tabIndex="0" role="button" aria-label={`${name} - ${z.type}`}>
              <circle cx={z.x} cy={z.y} r="8" fill="var(--hud-panel)" stroke={z.type === 'gate' ? 'var(--neon-blue)' : 'var(--text-dim)'} strokeWidth="1.5" />
              <text x={z.x} y={z.y + 3} fontSize="9" textAnchor="middle" fill="white">
                {z.type === 'gate' ? name[0] : '•'}
              </text>
              <text x={z.x} y={z.y + 20} fontSize="7" textAnchor="middle" fill="var(--text-dim)">{name}</text>
              <title>{name} ({z.type.toUpperCase()})</title>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

function App() {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);
  const [zones, setZones] = useState({});
  const [pathways, setPathways] = useState([]);
  const [logs, setLogs] = useState([]);

  // HUD Interaction States
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [activeRoute, setActiveRoute] = useState(null);
  const [layers, setLayers] = useState({
    data: true, gate: true, food: true, aid: true, vip: true, metro: true, cab: true, fanzone: true, merch: true, security: true, restroom: true
  });

  const typedReasoning = useTypewriter(apiResponse?.structuredResponse?.justification, 18, !!apiResponse);

  // Initialize and keep state stable
  useEffect(() => {
    const init = async () => {
      try {
        const [zRes, pRes, lRes] = await Promise.all([
          fetch(`${API_BASE}/api/simulation`),
          fetch(`${API_BASE}/api/pathways`),
          fetch(`${API_BASE}/api/logs`)
        ]);
        setZones(await zRes.json());
        setPathways(await pRes.json());
        setLogs(await lRes.json());
      } catch (err) { console.error('Bootstrap error', err); }
    };
    init();

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/simulation`);
        const data = await res.json();
        if (data && Object.keys(data).length > 0) setZones(data);
      } catch (e) { }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleAnalysis = async () => {
    if (!query || isProcessing) return;
    setIsProcessing(true);

    try {
      setActiveStep('bq');
      await new Promise(r => setTimeout(r, 900));

      const res = await fetch(`${API_BASE}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'OPERATOR_727', query })
      });
      const data = await res.json();

      setActiveStep('vertex');
      await new Promise(r => setTimeout(r, 1200));

      setActiveStep('firebase');
      await new Promise(r => setTimeout(r, 800));

      setApiResponse(data);
      setIsProcessing(false);
      setActiveStep(null);

      // Update Route ONLY if not a clarification request
      if (data.intent !== 'clarification') {
        const startKey = data.currentLocation;
        const endKey = data.destination;

        const startNode = zones[startKey];
        const endNode = zones[endKey];

        if (startNode && endNode) {
          setActiveRoute(`M ${startNode.x},${startNode.y} L ${endNode.x},${endNode.y}`);
        } else {
          setActiveRoute(null);
        }
      } else {
        setActiveRoute(null); // Clear route if clarifying
      }

      const logRes = await fetch(`${API_BASE}/api/logs`);
      setLogs(await logRes.json());
    } catch (err) {
      setIsProcessing(false);
      setActiveStep(null);
    }
  };

  return (
    <div className="hud-container">
      <header className="header glass-panel">
        <h1>Command Console // AI System Active</h1>
        <div className="subtitle" style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
          INTEGRATION: <span style={{ color: 'var(--neon-blue)' }}>BigQuery Data Layer</span> | <span style={{ color: 'var(--neon-purple)' }}>Vertex AI Engine</span> | <span style={{ color: 'var(--neon-green)' }}>Firebase Logs</span>
        </div>
      </header>

      <aside className="sidebar left-panel glass-panel" role="complementary" aria-label="Monitoring Station">
        <section className="hud-card">
          <div className="card-label">Live Signal Flow [Service Monitoring]</div>
          <div className={`step-item ${activeStep === 'bq' ? 'active' : ''} ${apiResponse ? 'success' : ''}`}>
            <span>01 // BIGQUERY DATASTREAM</span>
          </div>
          <div className={`step-item ${activeStep === 'vertex' ? 'active' : ''} ${apiResponse ? 'success' : ''}`}>
            <span>02 // VERTEX AI NEURAL ENGINE</span>
          </div>
          <div className={`step-item ${activeStep === 'firebase' ? 'active' : ''} ${apiResponse ? 'success' : ''}`}>
            <span>03 // FIREBASE AUDIT LOGGING</span>
          </div>
        </section>

        {apiResponse?.bqData && (
          <section className="hud-card">
            <div className="card-label">B-Query Telemetry</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '1.2rem', color: 'var(--neon-blue)' }}>{apiResponse.bqData.averageCrowd}%</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>AVG CONGESTION</div>
              </div>
              <div>
                <div className={`risk-${apiResponse.priority === 'high' ? 'high' : 'low'}`} style={{ fontSize: '1.1rem' }}>{apiResponse.bqData.congestionLevel}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>RISK STATUS</div>
              </div>
            </div>
            <svg viewBox="0 0 100 20" style={{ width: '100%', height: '30px', marginTop: '10px' }}>
              <path d="M 0,15 L 20,10 L 40,12 L 60,5 L 80,18 L 100,10" fill="none" stroke="var(--neon-blue)" strokeWidth="1" />
            </svg>
          </section>
        )}
      </aside>

      <main className="map-viewport" role="main" aria-label="Interactive Navigation Console">
        {/* NEW Top-Center Search HUB with improved UX */}
        <div className="search-hub">
          <div className={`search-bar-container ${apiResponse?.structuredResponse?.status === 'error' ? 'error-pulse' : ''}`}>
            <div className="search-icon" style={{ opacity: 0.5 }}>🔍</div>
            <input
              type="text"
              placeholder="e.g. I am at West Gate, where is the Medical Station?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalysis()}
              aria-label="Search Stadium Network"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setApiResponse(null); setActiveRoute(null); }}
                className="clear-btn"
                title="Clear Search"
              >
                ✕
              </button>
            )}
            <button
              className="search-btn"
              onClick={handleAnalysis}
              disabled={isProcessing}
              title="Locate Route"
            >
              {isProcessing ? '...' : '▶'}
            </button>
          </div>

          {/* Correct metadata display - ONLY shows if valid data exists */}
          {apiResponse && apiResponse.currentLocation && apiResponse.destination && (
            <div className="context-display">
              <div className="context-tag source">
                <span className="tag-label">FROM</span> {apiResponse.currentLocation}
              </div>
              <div className="context-tag dest">
                <span className="tag-label">TO</span> {apiResponse.destination}
              </div>
            </div>
          )}
        </div>

        <div className="layer-toggles">
          {Object.keys(layers).map(layer => (
            <button
              key={layer}
              className={`layer-btn ${layers[layer] ? 'active' : ''}`}
              onClick={() => setLayers(p => ({ ...p, [layer]: !p[layer] }))}
              aria-pressed={layers[layer]}
            >
              <div style={{ fontSize: '1rem' }}>{layer === 'data' ? '📊' : layer === 'gate' ? '🚪' : layer === 'food' ? '🍔' : '📍'}</div>
              <span>{layer.toUpperCase()}</span>
            </button>
          ))}
        </div>

        <div className="map-controls">
          <button className="control-btn" onClick={() => setZoom(z => Math.min(z + 0.2, 3))} aria-label="Zoom In">+</button>
          <button className="control-btn" onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))} aria-label="Zoom Out">-</button>
          <button className="control-btn" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} aria-label="Reset View">↺</button>
        </div>

        <MapEngine
          zones={zones}
          pathways={pathways}
          recommendedPath={activeRoute}
          activeLayers={layers}
          zoom={zoom}
          pan={pan}
          onPan={(dx, dy) => setPan(p => ({ x: p.x + dx, y: p.y + dy }))}
          onZoom={(dz) => setZoom(z => Math.max(0.5, Math.min(3, z + dz)))}
        />
      </main>

      <aside className="sidebar right-panel glass-panel" role="complementary" aria-label="AI Decision Engine">
        <div className="card-label">AI Decision Engine [Neural Output]</div>
        {apiResponse ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="hud-card" style={{ borderLeft: `4px solid ${(apiResponse.priority || 'normal') === 'high' ? 'var(--neon-red)' : 'var(--neon-blue)'}` }}>
              <div className={`risk-${(apiResponse.priority || 'normal') === 'high' ? 'high' : 'low'}`} style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {(apiResponse.priority || 'NORMAL').toUpperCase()} {(apiResponse.intent || 'UNKNOWN').toUpperCase()} DETECTED
              </div>
              <div style={{ fontSize: '0.7rem', opacity: 0.6, fontFamily: 'var(--font-mono)' }}>
                SESSION_ID: AI_OP_{Math.floor(Math.random() * 9000)}
              </div>
            </div>

            <div className="hud-card">
              <div className="card-label">Navigational Guidance</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                {apiResponse.structuredResponse?.message || 'Processing...'}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="context-tag" style={{ flex: 1, fontSize: '0.65rem' }}>
                  📏 {apiResponse.structuredResponse?.distance || '-- m'}
                </div>
                <div className="context-tag" style={{ flex: 1, fontSize: '0.65rem' }}>
                  🛤️ {apiResponse.structuredResponse?.pathName || '--'}
                </div>
              </div>
            </div>

            <div className="hud-card" style={{ background: 'rgba(0, 242, 255, 0.05)' }}>
              <div className="card-label">Neural Reasoning</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: '1.5', fontFamily: 'var(--font-mono)' }}>
                {typedReasoning}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '100px', opacity: 0.5, fontFamily: 'var(--font-mono)' }}>
            SYSTEM STANDBY // AWAITING COMMAND
          </div>
        )}
      </aside>

      <footer className="footer glass-panel sidebar" style={{ gridArea: 'footer', flexDirection: 'row', gap: '2rem' }}>
        <div style={{ flex: 1 }}>
          <div className="card-label">Firebase Interaction Logs [Audit Stream]</div>
          <div style={{ height: '90px', overflowY: 'auto' }}>
            {logs.slice(0, 5).map(l => (
              <div key={l.id} style={{ fontSize: '0.75rem', display: 'flex', gap: '1.25rem', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--neon-blue)' }}>{new Date(l.timestamp).toLocaleTimeString()}</span>
                <span style={{ flex: 1 }}>{l.query}</span>
                <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>{l.intent.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
