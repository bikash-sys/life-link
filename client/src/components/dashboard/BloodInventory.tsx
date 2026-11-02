import React from 'react';
import { Droplet, AlertCircle } from 'lucide-react';
import { BloodGroupSummary } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface BloodInventoryProps {
  items: BloodGroupSummary[];
}

export const BloodInventory: React.FC<BloodInventoryProps> = ({ items }) => {
  const criticalCount = items.filter((item) => item.status === 'Critical').length;

  return (
    <section className="dashboard-section blood-inventory-section" aria-labelledby="blood-inventory-title">
      <div className="section-header">
        <div className="section-title-wrap">
          <div className="section-icon-badge blood-icon-badge">
            <Droplet size={18} />
          </div>
          <div>
            <h2 id="blood-inventory-title" className="section-title">Blood Inventory</h2>
            <p className="section-subtitle">Reported available units by ABO & Rh blood groups</p>
          </div>
        </div>

        <div className="section-meta-pill">
          {criticalCount > 0 && (
            <span className="critical-warning-pill">
              <AlertCircle size={14} />
              {criticalCount} Critical Shortages
            </span>
          )}
          <span className="text-muted-tag">8 Groups Monitored</span>
        </div>
      </div>

      <div className="blood-groups-grid">
        {items.map((item) => {
          const isCritical = item.status === 'Critical';
          const isLow = item.status === 'Low';

          // Safe baseline calculation for visual progress bar (max 220)
          const fillPercentage = Math.min(100, Math.round((item.units / 220) * 100));

          return (
            <div
              key={item.bloodGroup}
              className={`blood-card ${isCritical ? 'blood-card-critical' : isLow ? 'blood-card-low' : ''}`}
              data-testid={`blood-card-${item.bloodGroup}`}
            >
              <div className="blood-card-header">
                <div className="blood-group-tag">
                  <span className="blood-symbol">{item.bloodGroup}</span>
                </div>
                <StatusBadge status={item.status} size="sm" />
              </div>

              <div className="blood-card-body">
                <div className="blood-units-number">{item.units}</div>
                <div className="blood-units-label">Units Available</div>

                {/* Subtle visual level indicator */}
                <div className="blood-level-track" aria-hidden="true">
                  <div
                    className={`blood-level-fill fill-${item.status.toLowerCase()}`}
                    style={{ width: `${fillPercentage}%` }}
                  />
                </div>

                <div className="blood-card-footer">
                  <span className="blood-min-threshold">Safe reserve: {item.minThreshold}u</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

