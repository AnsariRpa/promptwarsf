import React, { useState, useEffect, useRef } from 'react';
import './Dashboard.css';

/**
 * Simple Sparkline component for BigQuery trends
 */
const Sparkline = ({ data }) => {
  if (!data || data.length === 0) return null;
  const width = 100;
  const height = 40;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((d - min) / range) * height
  }));

  const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sparkline-container" aria-label="Congestion trend chart">
      <path d={pathData} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

/**
 * Interactive Stadium Map (Circular Bowl SVG)
 */
const StadiumMap = ({ recommendedPath, facilities }) => {
  return (
    <svg viewBox="0 0 500 500" className="stadium-svg" aria-label="Interactive Stadium Map">
      {/* Outer Stadium Structure */}
      <circle cx="250" cy="250" r="220" fill="#161b22" stroke="#30363d" strokeWidth="4" />
      <circle cx="250" cy="250" r="180" fill="#0d1117" stroke="#30363d" strokeWidth="2" />
      
      {/* Pitch / Center */}
      <rect x="180" y="210" width="140" height="80" fill="#1b222b" rx="4" />
      
      {/* Gates */}
      <g className="gates">
        <text x="250" y="20" className="gate-label">North Gate</text>
        <circle cx="250" cy="30" r="5" fill="#8b949e" />
        
        <text x="250" y="490" className="gate-label">South Gate</text>
        <circle cx="250" cy="470" r="5" fill="#8b949e" />
        
        <text x="10" y="255" className="gate-label" style={{textAnchor: 'start'}}>West Gate</text>
        <circle cx="30" cy="250" r="5" fill="#8b949e" />
        
        <text x="490" y="255" className="gate-label" style={{textAnchor: 'end'}}>East Gate</text>
        <circle cx="470" cy="250" r="5" fill="#8b949e" />
      </g>

      {/* Facility Markers */}
      {facilities.map((f, i) => (
        <g key={i} className="marker" tabIndex="0" role="button" aria-label={`${f.name} - ${f.type}`}>
          <circle cx={f.x} cy={f.y} r="10" fill={f.color || "#30363d"} />
          <text x={f.x} y={f.y + 4} fontSize="10" textAnchor="middle" fill="white">{f.icon}</text>
          <title>{f.name} ({f.type})</title>
        </g>
      ))}

      {/* Recommended AI Path Animation */}
      {recommendedPath && (
        <path 
          d={recommendedPath} 
          className="route-path animate-path" 
          aria-label="AI Recommended Route Path"
        />
      )}
    </svg>
  );
};

function App() {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState(null); // 'bq', 'vertex', 'firebase'
  const [stepsStatus, setStepsStatus] = useState({ bq: 'idle', vertex: 'idle', firebase: 'idle' });
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);

  // Facility Data
  const facilities = [
    { name: 'VIP Lounge A', type: 'VIP', x: 250, y: 150, icon: '👑', color: '#f59e0b' },
    { name: 'Security Post North', type: 'Security', x: 200, y: 70, icon: '🛡️', color: '#ef4444' },
    { name: 'Food Stall 1', type: 'Food', x: 100, y: 150, icon: '🍔' },
    { name: 'First Aid North', type: 'Safety', x: 400, y: 150, icon: '🏥', color: '#ef4444' },
    { name: 'Metro Station', type: 'Transport', x: 250, y: 430, icon: '🚇', color: '#6366f1' },
    { name: 'Fan Zone East', type: 'Entertainment', x: 420, y: 300, icon: '🎉' },
    { name: 'Cab Pickup South', type: 'Transport', x: 350, y: 460, icon: '🚕', color: '#6366f1' },
    { name: 'Restroom West', type: 'Utility', x: 80, y: 350, icon: '🚻' },
  ];

  // Fetch logs on mount
  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  const runAnalysis = async () => {
    if (!query || isProcessing) return;
    setIsProcessing(true);
    setResult(null);
    setCurrentPath(null);
    setStepsStatus({ bq: 'idle', vertex: 'idle', firebase: 'idle' });

    // Step 1: BigQuery (Sequential execution with 800ms delays)
    setActiveStep('bq');
    setStepsStatus(prev => ({ ...prev, bq: 'loading' }));
    await new Promise(r => setTimeout(r, 800));
    
    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo_user', query })
      });
      const data = await response.json();
      
      setStepsStatus(prev => ({ ...prev, bq: 'success' }));
      
      // Step 2: Vertex AI
      setActiveStep('vertex');
      setStepsStatus(prev => ({ ...prev, vertex: 'loading' }));
      await new Promise(r => setTimeout(r, 800));
      setStepsStatus(prev => ({ ...prev, vertex: 'success' }));

      // Step 3: Firebase
      setActiveStep('firebase');
      setStepsStatus(prev => ({ ...prev, firebase: 'loading' }));
      await new Promise(r => setTimeout(r, 800));
      setStepsStatus(prev => ({ ...prev, firebase: 'success' }));

      setResult(data);
      setIsProcessing(false);
      setActiveStep(null);
      fetchLogs(); // Refresh logs panel

      // Visual Path Simulation based on response
      if (data.structuredResponse.direction.includes('North')) {
        setCurrentPath("M 250,250 C 250,200 250,100 250,30");
      } else if (data.structuredResponse.direction.includes('South')) {
        setCurrentPath("M 250,250 C 250,300 250,400 250,470");
      } else if (data.structuredResponse.direction.includes('East')) {
        setCurrentPath("M 250,250 C 300,250 400,250 470,250");
      } else {
        setCurrentPath("M 250,250 C 200,250 100,250 30,250");
      }

    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="header" role="banner">
        <div>
          <h1>Smart Stadium AI Console</h1>
          <div className="subtitle">Operational Command Center • v2.1.0</div>
        </div>
        <div className="subtitle" style={{textAlign: 'right'}}>
          Detected Integration: <span style={{color: '#6366f1'}}>BigQuery</span> | <span style={{color: '#10b981'}}>Vertex AI</span> | <span style={{color: '#f59e0b'}}>Firebase</span>
        </div>
      </header>

      <aside className="left-panel" role="complementary" aria-label="Command Input">
        <section className="card">
          <h2 className="card-title">⌨️ COMMAND CENTER</h2>
          <label htmlFor="userQuery" className="visually-hidden">Enter Stadium Query</label>
          <input 
            id="userQuery"
            type="text" 
            placeholder="Ask about stadium navigation or safety..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runAnalysis()}
            aria-required="true"
          />
          <button 
            onClick={runAnalysis} 
            disabled={isProcessing}
            style={{marginTop: '1rem', width: '100%'}}
            aria-label="Submit Analysis Query"
          >
            {isProcessing ? 'PROCESSING...' : 'RUN AI ANALYSIS'}
          </button>
        </section>

        <section className="card">
          <h2 className="card-title">🔄 SERVICE FLOW WATCH</h2>
          <div className="step-container">
            <div className={`step-item ${activeStep === 'bq' ? 'active' : ''} ${stepsStatus.bq === 'success' ? 'success' : ''}`}>
              <div className="step-label">1. BigQuery Data Fetch</div>
              {stepsStatus.bq === 'success' && <span>✅</span>}
            </div>
            <div className={`step-item ${activeStep === 'vertex' ? 'active' : ''} ${stepsStatus.vertex === 'success' ? 'success' : ''}`}>
              <div className="step-label">2. Vertex AI Reasoning</div>
              {stepsStatus.vertex === 'success' && <span>✅</span>}
            </div>
            <div className={`step-item ${activeStep === 'firebase' ? 'active' : ''} ${stepsStatus.firebase === 'success' ? 'success' : ''}`}>
              <div className="step-label">3. Firebase Audit Sync</div>
              {stepsStatus.firebase === 'success' && <span>✅</span>}
            </div>
          </div>
        </section>

        {result && result.bqData && (
          <section className="card fade-in">
            <h2 className="card-title">📊 BigQuery ANALYTICS</h2>
            <div className="data-grid">
              <div className="data-item">
                <div className="data-value">{result.bqData.averageCrowd}%</div>
                <div className="data-label">Avg. Congestion</div>
              </div>
              <div className="data-item">
                <div className="data-value">{result.bqData.congestionLevel}</div>
                <div className="data-label">Risk Level</div>
              </div>
            </div>
            <div style={{marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
              Peak Traffic: {result.bqData.peakTime}
            </div>
            <Sparkline data={result.bqData.trends} />
            <div style={{textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px'}}>Historical Congestion Trend (24h)</div>
          </section>
        )}
      </aside>

      <main className="center-panel" role="main" aria-label="Stadium Map View">
        <StadiumMap recommendedPath={currentPath} facilities={facilities} />
        {currentPath && (
          <div className="fade-in glass" style={{position: 'absolute', bottom: '2rem', background: 'rgba(13,17,23,0.8)', padding: '1rem', border: '1px solid var(--primary-glow)', borderRadius: '8px'}}>
            <div style={{fontSize: '0.8rem', fontWeight: 600}}>AI Recommended Path Active</div>
            <div style={{fontSize: '0.7rem', color: 'var(--text-secondary)'}}>Optimizing for {result?.structuredResponse.direction} destination</div>
          </div>
        )}
      </main>

      <aside className="right-panel" role="complementary" aria-label="AI Reasoning Details">
        {result ? (
          <>
            <section className="card insight-card fade-in">
              <h2 className="card-title">🧠 Vertex AI INSIGHT</h2>
              <div className={`risk-${result.priority.toLowerCase()}`} style={{marginBottom: '0.5rem'}}>
                {result.priority.toUpperCase()} PRIORITY {result.intent.toUpperCase()}
              </div>
              <div style={{fontSize: '0.9rem'}}>{result.structuredResponse.justification}</div>
            </section>

            <section className="card fade-in" style={{animationDelay: '0.1s'}}>
              <h2 className="card-title">✅ RECOMMENDATION</h2>
              <div style={{fontSize: '1rem', fontWeight: 600}}>{result.structuredResponse.message}</div>
            </section>

            <section className="card fade-in" style={{animationDelay: '0.2s'}}>
              <h2 className="card-title">📍 NEXT ACTION</h2>
              <div className="data-item">
                <div className="data-label">DESTINATION</div>
                <div className="data-value" style={{fontSize: '0.9rem'}}>{result.structuredResponse.destination}</div>
              </div>
              <div className="data-item" style={{marginTop: '0.5rem'}}>
                <div className="data-label">PRIMARY ROUTE</div>
                <div className="data-value" style={{fontSize: '0.9rem'}}>{result.structuredResponse.direction}</div>
              </div>
            </section>
          </>
        ) : (
          <div style={{color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20vh'}}>
             Initiate Command to Start Analysis
          </div>
        )}
      </aside>

      <footer className="footer" role="contentinfo">
        <h2 className="card-title" style={{marginBottom: '0.5rem'}}>🔥 RECENT FIREBASE LOGS</h2>
        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
          {logs.length > 0 ? logs.map(log => (
            <div key={log.id} style={{fontSize: '0.75rem', borderBottom: '1px solid #21262d', paddingBottom: '0.25rem', display: 'flex', justifyContent: 'space-between'}}>
              <span style={{color: 'var(--text-secondary)'}}>
                [{new Date(log.timestamp).toLocaleTimeString()}] <strong>{log.query}</strong>
              </span>
              <span style={{color: '#10b981'}}>{log.outcome?.destination || 'Processing...'}</span>
            </div>
          )) : (
            <div style={{color: 'var(--text-secondary)', fontSize: '0.75rem'}}>No historical logs found. Run your first query.</div>
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;
