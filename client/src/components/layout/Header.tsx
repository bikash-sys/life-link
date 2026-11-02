import React from 'react';
import { Menu, Bell, Building2, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onToggleSidebar: () => void;
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  title = 'Dashboard',
  subtitle = 'Overview of blood and essential medicine availability.',
}) => {
  const { user } = useAuth();

  return (
    <header className="app-header" aria-label="Page header">
      <div className="header-left">
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu size={22} />
        </button>
        <div>
          <h1 className="header-title">{title}</h1>
          <p className="header-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="header-right">
        {/* Facility Pill */}
        <div className="facility-indicator" title="Connected Facility">
          <Building2 size={15} className="facility-icon" />
          <span className="facility-name">
            {user?.facilityName || 'Central Healthcare Network'}
          </span>
        </div>

        {/* Notification Icon */}
        <button
          type="button"
          className="btn-notification"
          aria-label="View notifications (4 new alerts)"
          title="Notifications & Shortage Alerts"
        >
          <Bell size={19} />
          <span className="notification-badge" aria-hidden="true">
            4
          </span>
        </button>

        {/* User Pill / Profile Area */}
        <div className="header-user-pill" title={`Logged in as ${user?.email || 'Staff'}`}>
          <div className="header-user-avatar">
            <UserCircle size={28} />
          </div>
          <div className="header-user-text">
            <span className="header-user-name">{user?.name || 'Authorized Staff'}</span>
            <span className="header-user-role">
              {user?.role === 'FACILITY_ADMIN' ? 'Facility Admin' : 'Staff Member'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

