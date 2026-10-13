import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, CheckCircle2, Server, Globe, Database, ArrowRight } from 'lucide-react';

export const App: React.FC = () => {
  const [serverHealth, setServerHealth] = useState<{
    status: string;
    service?: string;
    timestamp?: string;
  } | null>(null);
  const [checkingServer, setCheckingServer] = useState(false);

  const checkBackend = async () => {
    setCheckingServer(true);
    try {
      const res = await fetch('http://localhost:5000/health');
      if (res.ok) {
        const data = await res.json();
        setServerHealth(data);
      } else {
        setServerHealth({ status: 'offline' });
      }
    } catch {
      setServerHealth({ status: 'offline' });
    } finally {
      setCheckingServer(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initialCheck = async () => {
      setCheckingServer(true);
      try {
        const res = await fetch('http://localhost:5000/health');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setServerHealth(data);
        } else {
          if (isMounted) setServerHealth({ status: 'offline' });
        }
      } catch {
        if (isMounted) setServerHealth({ status: 'offline' });
      } finally {
        if (isMounted) setCheckingServer(false);
      }
    };

    initialCheck();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="app-container">
      <header className="header-brand">
        <div className="brand-icon-wrapper">
          <Activity size={32} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 className="brand-title">LifeLink</h1>
            <span className="brand-badge">
              <CheckCircle2 size={13} />
              Frontend Active
            </span>
          </div>
          <p className="brand-subtitle">
            Community Blood and Essential Medicine Availability Network
          </p>
        </div>
      </header>

      <main>
        <section className="hero-card">
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            System Foundation Ready
          </h2>
          <p className="hero-description">
            Welcome to LifeLink. The project foundation has been successfully initialized on the
            shared <code>main</code> branch with full TypeScript support, a unified monorepo structure,
            and dedicated application and database workspaces.
          </p>

          <div className="status-grid">
            <div className="status-card">
              <div className="card-header">
                <span className="card-label">Client App</span>
                <span className="pill-online">
                  <span className="pulse-dot"></span>
                  Active
                </span>
              </div>
              <div className="card-value">React 18 + Vite</div>
              <div className="card-subtext">Port 5173 • TypeScript</div>
            </div>

            <div className="status-card">
              <div className="card-header">
                <span className="card-label">Server API</span>
                {serverHealth?.status === 'ok' ? (
                  <span className="pill-online">
                    <span className="pulse-dot"></span>
                    Connected
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {checkingServer ? 'Checking...' : 'Standby'}
                  </span>
                )}
              </div>
              <div className="card-value">Express API</div>
              <div className="card-subtext">
                {serverHealth?.status === 'ok'
                  ? `${serverHealth.service} (${serverHealth.status})`
                  : 'Port 5000 • http://localhost:5000/health'}
              </div>
            </div>

            <div className="status-card">
              <div className="card-header">
                <span className="card-label">Repository Branch</span>
                <span className="pill-online" style={{ color: '#38bdf8' }}>
                  <Database size={12} />
                  origin/main
                </span>
              </div>
              <div className="card-value">Direct Collaboration</div>
              <div className="card-subtext">Two-Developer Academic Plan</div>
            </div>
          </div>

          <div className="disclaimer-banner">
            <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Medical Safety Notice:</strong> LifeLink displays reported facility
              availability for informational coordination only. It does not guarantee live
              physical supply and does not replace emergency clinical assessment or professional
              cross-matching.
            </div>
          </div>

          <div className="actions-row">
            <button
              className="btn-primary"
              onClick={checkBackend}
              disabled={checkingServer}
              id="check-health-btn"
            >
              <Server size={16} />
              {checkingServer ? 'Pinging Server...' : 'Ping API Health Endpoint'}
            </button>
            <a
              href="https://github.com/bikash-sys/life-link"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
              style={{ textDecoration: 'none' }}
            >
              <Globe size={16} />
              View GitHub Repository
              <ArrowRight size={14} />
            </a>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
