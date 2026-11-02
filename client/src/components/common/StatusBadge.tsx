import React from 'react';
import { InventoryHealthStatus, MedicineStatus } from '../../types';

interface StatusBadgeProps {
  status: InventoryHealthStatus | MedicineStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = status.toLowerCase();

  let variantClass = 'badge-healthy';
  let dotColor = '#16a34a';

  if (normalized === 'critical' || normalized === 'out of stock') {
    variantClass = 'badge-critical';
    dotColor = '#dc2626';
  } else if (normalized === 'low' || normalized === 'warning') {
    variantClass = 'badge-warning';
    dotColor = '#d97706';
  } else if (normalized === 'healthy' || normalized === 'available') {
    variantClass = 'badge-healthy';
    dotColor = '#16a34a';
  } else {
    variantClass = 'badge-neutral';
    dotColor = '#64748b';
  }

  return (
    <span className={`status-badge ${variantClass} size-${size}`}>
      <span className="badge-dot" style={{ backgroundColor: dotColor }} />
      <span className="badge-text">{status}</span>
    </span>
  );
};

