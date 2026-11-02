import React from 'react';
import {
  Activity,
  LayoutDashboard,
  Droplet,
  Pill,
  GitPullRequest,
  Building2,
  ScrollText,
  Settings,
  LogOut,
  X,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeNav?: string;
  onSelectNav?: (navId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeNav = 'dashboard',
  onSelectNav,
}) => {
  const { user, logout } = useAuth();

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'blood-inventory', label: 'Blood Inventory', icon: Droplet },
    { id: 'medicine-inventory', label: 'Medicine Inventory', icon: Pill },
    { id: 'requests', label: 'Requests', icon: GitPullRequest },
    { id: 'facilities', label: 'Facilities', icon: Building2 },
    { id: 'activity-logs', label: 'Activity / Logs', icon: ScrollText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id: string) => {
    if (onSelectNav) {
      onSelectNav(id);
    }
    // Close sidebar on mobile upon item selection
    if (isOpen) {
      onClose();
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${isOpen ? 'sidebar-open' : ''}`} aria-label="Main Navigation">
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-logo-container">
            <Activity className="brand-logo-icon" size={22} />
          </div>
          <div className="brand-text-container">
            <span className="brand-title-text">LifeLink</span>
            <span className="brand-tagline-text">Blood & Medicine Network</span>
          </div>
          <button
            type="button"
            className="mobile-close-btn"
            onClick={onClose}
            aria-label="Close navigation sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          <div className="nav-group-title">MAIN NAVIGATION</div>
          <ul className="nav-list">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="nav-icon" size={18} />
                    <span className="nav-label">{item.label}</span>
                    {item.id === 'blood-inventory' && (
                      <span className="nav-counter-critical" title="3 blood groups critical">
                        3
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile & Logout Section at Bottom */}
        <div className="sidebar-footer">
          <div className="user-profile-card">
            <div className="user-avatar" aria-hidden="true">
              <User size={18} />
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name || 'Healthcare Staff'}</span>
              <span className="user-facility" title={user?.facilityName}>
                {user?.facilityName || 'Facility Member'}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn-logout"
            onClick={handleLogout}
            title="Log out from LifeLink"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

