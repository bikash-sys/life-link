import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Lock,
  Mail,
  ShieldCheck,
  CheckCircle2,
  HeartHandshake,
  ArrowRight,
  Database,
  Building,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MedicalNotice } from '../components/common/MedicalNotice';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('s.jenkins@citycentral.org');
  const [password, setPassword] = useState('••••••••••••');
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate small network delay for realistic feel
    setTimeout(async () => {
      await login(email, password);
      setIsLoading(false);
      navigate('/dashboard');
    }, 350);
  };

  const handleDemoFill = () => {
    setEmail('s.jenkins@citycentral.org');
    setPassword('DemoHospitalPass2026!');
  };

  return (
    <div className="login-page-container">
      <div className="login-card-wrapper">
        {/* Left Side: Login Form */}
        <div className="login-form-pane">
          <div className="login-brand-header">
            <div className="login-brand-badge">
              <Activity size={24} className="login-brand-icon" />
            </div>
            <div>
              <span className="login-brand-name">LifeLink</span>
              <p className="login-brand-tagline">Connecting Blood, Medicine and Care.</p>
            </div>
          </div>

          <div className="login-form-heading">
            <h1 className="login-title">Sign In to Platform</h1>
            <p className="login-subtitle">
              Enter your authorized healthcare facility credentials to access the inventory dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">
                Email / User ID
              </label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="name@hospital.org or staff ID"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="login-password" className="form-label">
                  Password
                </label>
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={() => setForgotPasswordMsg(true)}
                >
                  Forgot password?
                </button>
              </div>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="login-password"
                  type="password"
                  className="form-input"
                  placeholder="Enter secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {forgotPasswordMsg && (
              <div className="forgot-password-alert" role="status">
                <span>
                  For security reasons, password resets require verification by your facility
                  supervising administrator.
                </span>
                <button
                  type="button"
                  className="alert-dismiss-btn"
                  onClick={() => setForgotPasswordMsg(false)}
                >
                  Dismiss
                </button>
              </div>
            )}

            <button
              type="submit"
              className="btn-login-submit"
              disabled={isLoading}
              id="login-submit-btn"
            >
              <span>{isLoading ? 'Verifying Facility Access...' : 'Access Dashboard'}</span>
              <ArrowRight size={18} />
            </button>

            <div className="demo-credentials-box">
              <div className="demo-box-header">
                <ShieldCheck size={16} />
                <span>Academic Demo Environment</span>
              </div>
              <p className="demo-box-text">
                Currently running in Stage 5 frontend foundation mode. Real authentication
                endpoints will be connected in future development.
              </p>
              <button
                type="button"
                className="btn-demo-fill"
                onClick={handleDemoFill}
              >
                Use Preset Demo Staff Account
              </button>
            </div>
          </form>

          <div className="login-footer-notice">
            <MedicalNotice />
          </div>
        </div>

        {/* Right Side: Healthcare Visual Treatment (Desktop Only) */}
        <div className="login-visual-pane">
          <div className="visual-pane-content">
            <div className="visual-badge">
              <ShieldCheck size={16} />
              <span>Hospital & Pharmacy Network</span>
            </div>

            <h2 className="visual-hero-title">
              Precision Availability for Life-Saving Resources
            </h2>
            <p className="visual-hero-description">
              LifeLink bridges blood banks, regional medical centers, and essential pharmacies to
              monitor stock levels, coordinate urgent transfers, and eliminate life-critical delays.
            </p>

            <div className="visual-features-list">
              <div className="visual-feature-item">
                <div className="feature-icon-pill">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h3 className="feature-heading">Real-Time ABO / Rh Blood Tracking</h3>
                  <p className="feature-desc">
                    Live visibility into safe reserves, critical group alerts, and batch collection
                    lifecycles across licensed facilities.
                  </p>
                </div>
              </div>

              <div className="visual-feature-item">
                <div className="feature-icon-pill">
                  <Building size={18} />
                </div>
                <div>
                  <h3 className="feature-heading">Essential Medicine Shortage Prevention</h3>
                  <p className="feature-desc">
                    Early-warning analytics on antibiotics, insulin, and crash-cart essentials prior
                    to stockout.
                  </p>
                </div>
              </div>

              <div className="visual-feature-item">
                <div className="feature-icon-pill">
                  <HeartHandshake size={18} />
                </div>
                <div>
                  <h3 className="feature-heading">Emergency Mutual Aid Coordination</h3>
                  <p className="feature-desc">
                    Inter-facility requisition workflows designed for clinical urgency and zero
                    bureaucratic friction.
                  </p>
                </div>
              </div>
            </div>

            <div className="visual-trust-footer">
              <div className="trust-indicator">
                <Database size={15} />
                <span>PostgreSQL Monitored</span>
              </div>
              <div className="trust-indicator">
                <ShieldCheck size={15} />
                <span>Audited Transaction Logging</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

