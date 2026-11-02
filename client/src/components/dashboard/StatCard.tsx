import React from 'react';
import { Droplet, AlertTriangle, Pill, Clock } from 'lucide-react';
import { DashboardStat } from '../../types';

interface StatCardProps {
  stat: DashboardStat;
}

export const StatCard: React.FC<StatCardProps> = ({ stat }) => {
  // Select appropriate icon based on stat ID
  const renderIcon = () => {
    switch (stat.id) {
      case 'total-blood-units':
        return <Droplet size={22} className="stat-icon-blood" />;
      case 'critical-blood-groups':
        return <AlertTriangle size={22} className="stat-icon-critical" />;
      case 'medicines-available':
        return <Pill size={22} className="stat-icon-medicine" />;
      case 'active-requests':
        return <Clock size={22} className="stat-icon-requests" />;
      default:
        return <Droplet size={22} />;
    }
  };

  const badgeClass = `stat-badge badge-${stat.badgeType}`;

  return (
    <div className="stat-card" data-testid={`stat-${stat.id}`}>
      <div className="stat-card-top">
        <div className="stat-icon-wrapper">{renderIcon()}</div>
        <span className={badgeClass}>{stat.badgeText}</span>
      </div>
      <div className="stat-card-body">
        <span className="stat-label">{stat.label}</span>
        <div className="stat-value">{stat.value}</div>
        <span className="stat-subtext">{stat.subtext}</span>
      </div>
    </div>
  );
};

