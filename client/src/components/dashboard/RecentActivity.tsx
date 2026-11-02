import React from 'react';
import {
  ScrollText,
  Droplet,
  Pill,
  Heart,
  AlertTriangle,
  ArrowRightLeft,
  Clock,
} from 'lucide-react';
import { RecentActivityItem } from '../../types';

interface RecentActivityProps {
  activities: RecentActivityItem[];
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => {
  const getActivityIcon = (type: RecentActivityItem['type']) => {
    switch (type) {
      case 'blood':
        return <Droplet size={16} className="activity-icon-blood" />;
      case 'medicine':
        return <Pill size={16} className="activity-icon-medicine" />;
      case 'donation':
        return <Heart size={16} className="activity-icon-donation" />;
      case 'alert':
        return <AlertTriangle size={16} className="activity-icon-alert" />;
      case 'transfer':
        return <ArrowRightLeft size={16} className="activity-icon-transfer" />;
      default:
        return <Clock size={16} />;
    }
  };

  return (
    <section className="dashboard-section recent-activity-section" aria-labelledby="recent-activity-title">
      <div className="section-header">
        <div className="section-title-wrap">
          <div className="section-icon-badge activity-icon-badge">
            <ScrollText size={18} />
          </div>
          <div>
            <h2 id="recent-activity-title" className="section-title">Recent Activity</h2>
            <p className="section-subtitle">Real-time log of requisitions, donations, and inventory updates</p>
          </div>
        </div>
        <div className="section-meta-pill">
          <span className="live-dot" aria-hidden="true" />
          <span className="text-muted-tag">Audit Stream Active</span>
        </div>
      </div>

      <div className="activity-timeline">
        {activities.map((item) => (
          <div key={item.id} className="activity-item">
            <div className={`activity-icon-wrapper type-${item.type}`}>
              {getActivityIcon(item.type)}
            </div>
            <div className="activity-content">
              <div className="activity-main-line">
                <span className="activity-title">{item.title}</span>
                <span className="activity-timestamp">
                  <Clock size={12} className="timestamp-clock-icon" />
                  {item.timestamp}
                </span>
              </div>
              {item.detail && <p className="activity-detail">{item.detail}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

