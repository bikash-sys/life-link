import React from 'react';
import { Pill } from 'lucide-react';
import { MedicineItem } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface MedicineInventoryProps {
  medicines: MedicineItem[];
}

export const MedicineInventory: React.FC<MedicineInventoryProps> = ({ medicines }) => {
  return (
    <section className="dashboard-section medicine-inventory-section" aria-labelledby="medicine-inventory-title">
      <div className="section-header">
        <div className="section-title-wrap">
          <div className="section-icon-badge medicine-icon-badge">
            <Pill size={18} />
          </div>
          <div>
            <h2 id="medicine-inventory-title" className="section-title">Medicine Inventory</h2>
            <p className="section-subtitle">Key essential pharmaceuticals and current facility batch stock</p>
          </div>
        </div>
        <div className="section-meta-pill">
          <span className="text-muted-tag">{medicines.length} Tracked Formulations</span>
        </div>
      </div>

      <div className="table-responsive-wrapper">
        <table className="medical-table" aria-label="Medicine Inventory Table">
          <thead>
            <tr>
              <th scope="col">Medicine</th>
              <th scope="col">Category</th>
              <th scope="col" className="text-right">Available Quantity</th>
              <th scope="col">Expiry</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {medicines.map((med) => (
              <tr key={med.id} className="table-row">
                <td>
                  <div className="medicine-name-cell">
                    <span className="medicine-primary-name">{med.name}</span>
                    <span className="medicine-dosage">{med.dosageForm}</span>
                  </div>
                </td>
                <td>
                  <span className="category-pill">{med.category}</span>
                </td>
                <td className="text-right">
                  <div className="quantity-cell">
                    <span className="quantity-val">{med.availableQuantity.toLocaleString()}</span>
                    <span className="quantity-unit">{med.unit}</span>
                  </div>
                </td>
                <td>
                  <span className="expiry-cell">{med.expiry}</span>
                </td>
                <td>
                  <StatusBadge status={med.status} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

