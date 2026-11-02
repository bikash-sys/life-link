import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const MedicalNotice: React.FC = () => {
  return (
    <aside className="medical-safety-banner" aria-label="Medical Safety Notice">
      <div className="medical-safety-icon" aria-hidden="true">
        <ShieldAlert size={18} />
      </div>
      <div className="medical-safety-content">
        <strong>Medical Safety Notice:</strong> LifeLink displays reported facility availability
        for informational coordination only. It does not guarantee physical in-stock inventory and
        does not replace emergency clinical assessment, cross-matching, or direct hospital dispatch.
      </div>
    </aside>
  );
};

