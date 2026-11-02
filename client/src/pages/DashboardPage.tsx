import React, { useState } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/dashboard/StatCard';
import { BloodInventory } from '../components/dashboard/BloodInventory';
import { MedicineInventory } from '../components/dashboard/MedicineInventory';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { MedicalNotice } from '../components/common/MedicalNotice';
import {
  MOCK_DASHBOARD_STATS,
  MOCK_BLOOD_INVENTORY,
  MOCK_MEDICINE_INVENTORY,
  MOCK_RECENT_ACTIVITY,
} from '../mock/mockData';

export const DashboardPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [navNotification, setNavNotification] = useState<string | null>(null);

  const handleNavSelect = (navId: string) => {
    setActiveNav(navId);

    if (navId === 'dashboard') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setNavNotification(null);
    } else if (navId === 'blood-inventory') {
      const element = document.getElementById('blood-inventory-title');
      element?.scrollIntoView({ behavior: 'smooth' });
      setNavNotification('Viewing Blood Inventory Preview. Full inventory management coming in next stage.');
    } else if (navId === 'medicine-inventory') {
      const element = document.getElementById('medicine-inventory-title');
      element?.scrollIntoView({ behavior: 'smooth' });
      setNavNotification('Viewing Medicine Inventory Preview. Full catalog management coming in next stage.');
    } else if (navId === 'activity-logs') {
      const element = document.getElementById('recent-activity-title');
      element?.scrollIntoView({ behavior: 'smooth' });
      setNavNotification('Viewing Audit Stream Preview. Full activity logs coming in next stage.');
    } else {
      setNavNotification(
        `Navigation to "${navId.replace('-', ' ').toUpperCase()}" registered. Detailed module will be activated in upcoming development phases.`,
      );
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeNav={activeNav}
        onSelectNav={handleNavSelect}
      />

      {/* Main Content Area */}
      <div className="dashboard-main-wrapper">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          title="Dashboard"
          subtitle="Overview of blood and essential medicine availability."
        />

        <main className="dashboard-content-area">
          {/* Medical Legal and Clinical Notice */}
          <div className="notice-container">
            <MedicalNotice />
          </div>

          {/* Navigation Feedback Toast / Banner */}
          {navNotification && (
            <div className="nav-info-banner" role="status">
              <span>{navNotification}</span>
              <button
                type="button"
                className="banner-close-btn"
                onClick={() => setNavNotification(null)}
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>
          )}

          {/* 4 Summary Metric Cards */}
          <section className="stats-grid-container" aria-label="Key Inventory Metrics">
            {MOCK_DASHBOARD_STATS.map((stat) => (
              <StatCard key={stat.id} stat={stat} />
            ))}
          </section>

          {/* Blood Inventory Section */}
          <div className="dashboard-grid-row">
            <BloodInventory items={MOCK_BLOOD_INVENTORY} />
          </div>

          {/* Two-Column Responsive Section: Medicine Inventory & Recent Activity */}
          <div className="dashboard-split-grid">
            <div className="split-grid-primary">
              <MedicineInventory medicines={MOCK_MEDICINE_INVENTORY} />
            </div>
            <div className="split-grid-secondary">
              <RecentActivity activities={MOCK_RECENT_ACTIVITY} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

