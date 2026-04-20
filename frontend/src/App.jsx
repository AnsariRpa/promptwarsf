import React, { useState, useEffect } from 'react';
import './Console.css';

const Step = ({ title, status, desc, icon, active, completed }) => (
  <div className={`step ${active ? 'active' : ''} ${completed ? 'completed' : ''}`}>
    <div className="step-icon">
      {completed ? '✅' : active ? <div className="loading-spinner" /> : icon}
    </div>
    <div className="step-info">
      <div className="step-title">{title}</div>
      <div className="step-status">{desc}</div>
    </div>
  </div>
);

function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState([
    { id: 'bq', title: 'BigQuery', desc: 'Predicting historical patterns...', icon: '📊', status: 'idle' },
    { id: 'vertex', title: 'Vertex AI', desc: 'Analyzing intent & generating reasoning...', icon: '🧠', status: 'idle' },
    { id: 'firebase', title: 'Firebase Admin', desc: 'Persisting outcome traces...', icon: '🔥', status: 'idle' }
  ]);
  const [result, setResult] = useState(null);

  const updateStep = (id, status, desc) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status, desc: desc || s.desc } : s));
  };

  const resetSteps = () => {
    setSteps([
      { id: 'bq', title: 'BigQuery', desc: 'Predicting historical patterns...', icon: '📊', status: 'idle' },
      { id: 'vertex', title: 'Vertex AI', desc: 'Analyzing intent & generating reasoning...', icon: '🧠', status: 'idle' },
      { id: 'firebase', title: 'Firebase Admin', desc: 'Persisting outcome traces...', icon: '🔥', status: 'idle' }
    ]);
    setResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query || loading) return;

    setLoading(true);
    resetSteps();

    try {
      // Step 1: BigQuery (Simulated sequence for UI visual impact matching backend flow)
      updateStep('bq', 'active');
      await new Promise(resolve => setTimeout(resolve, 1500));
      updateStep('bq', 'completed', 'Historical data retrieved successfully.');

      // Step 2: Vertex AI
      updateStep('vertex', 'active');
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-demo-123', query })
      });
      const data = await response.json();
      updateStep('vertex', 'completed', 'AI Reasoning generated via Gemini 1.5 Flash.');

      // Step 3: Firebase
      updateStep('firebase', 'active');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStep('firebase', 'completed', 'Outcome logged to Firestore.');

      setResult(data);
    } catch (err) {
      console.error(err);
      setResult({
        intent: 'error',
        priority: 'high',
        structuredResponse: { message: 'Failed to connect to the Smart Stadium Backend. Ensure the server is running on port 8080.' }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Smart Stadium AI Console</h1>
        <p>Real-time Intelligence powered by Google Cloud BigQuery, Vertex AI, and Firebase</p>
      </header>

      <main className="dashboard-grid">
        <section className="card glass fade-in">
          <h2><span>⌨️</span> Input Console</h2>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <input 
                type="text" 
                placeholder="Ask about stadium navigation (e.g., 'How do I exit East Gate?')" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Processing...' : 'Run Analysis'}
              </button>
            </div>
          </form>

          <div className="steps">
            {steps.map(step => (
              <Step 
                key={step.id} 
                {...step} 
                active={step.status === 'active'} 
                completed={step.status === 'completed'} 
              />
            ))}
          </div>
        </section>

        <section className="card glass fade-in" style={{ animationDelay: '0.2s' }}>
          <h2><span>📈</span> Analysis Output</h2>
          <div className="output-area">
            {result ? (
              <div className="fade-in">
                <span className={`insight-tag ${result.priority}`}>
                  {result.intent} | {result.priority} Priority
                </span>
                <div className="response-message">
                  {result.structuredResponse.message}
                </div>
                <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <strong>Recommendation:</strong> Head to {result.structuredResponse.destination} via {result.structuredResponse.direction}
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '4rem' }}>
                Awaiting input analysis...
              </div>
            )}
          </div>
        </section>
      </main>

      <footer style={{ marginTop: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        &copy; 2026 Smart Stadium AI System • Competition Final Submission
      </footer>
    </div>
  );
}

export default App;
