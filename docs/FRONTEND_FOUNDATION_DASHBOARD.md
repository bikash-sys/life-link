# LifeLink — Frontend Foundation & Dashboard UI (Stage 5)

## 📌 Executive Summary
This document outlines the frontend foundation and professional healthcare-tech dashboard interface implemented for **LifeLink (Stage 5 — Blood and Medicine Inventory)**. The user interface is engineered to provide authorized hospital staff, blood bank technicians, and pharmacists with immediate visibility into critical blood group reserves and essential pharmaceuticals.

---

## 🎨 Visual Design System & Clinical Palette

The interface adheres to a restrained, professional healthcare design standard suitable for clinical environments:

| Token | Hex / Value | Usage Scope |
|---|---|---|
| `--bg-app` | `#f8fafc` | Clean off-white canvas for the dashboard shell |
| `--bg-surface` | `#ffffff` | Elevated cards, data tables, and input panels |
| `--navy-900` | `#0f172a` | Deep navy for primary navigation, headings, and high-contrast text |
| `--navy-800` | `#1e293b` | Active navigation links and profile surfaces |
| `--blood-red` | `#dc2626` | Reserved strictly for ABO/Rh blood alerts and critical low-stock items |
| `--green-text` / `--green-dot` | `#166534` / `#16a34a` | Healthy inventory status and stable supply confirmation |
| `--amber-text` / `--amber-dot` | `#92400e` / `#d97706` | Warning indicators for items nearing reorder thresholds |
| `--border-subtle` | `#e2e8f0` | Crisp borders maintaining visual structure without visual clutter |

---

## 📂 Frontend Directory Architecture

```text
client/src/
├── types/
│   └── index.ts                 # Strict TypeScript models for inventory, metrics, and users
├── mock/
│   └── mockData.ts              # Local mock fixtures ready for backend API replacement
├── context/
│   └── AuthContext.tsx          # Session provider with mock login/logout lifecycle
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx          # Responsive navigation drawer with profile & logout
│   │   └── Header.tsx           # Page header with facility badge, notifications & avatar
│   ├── dashboard/
│   │   ├── StatCard.tsx         # 4 summary metrics with contextual pill tags
│   │   ├── BloodInventory.tsx   # 8 blood group cards (A+, A-, B+, B-, AB+, AB-, O+, O-)
│   │   ├── MedicineInventory.tsx# Responsive table for pharmaceuticals and expiries
│   │   └── RecentActivity.tsx   # Real-time timeline of requests, batches & donations
│   └── common/
│       ├── StatusBadge.tsx      # Clinical status pills (Healthy, Low, Critical, Available)
│       └── MedicalNotice.tsx    # Mandatory clinical informational disclaimer banner
├── pages/
│   ├── LoginPage.tsx            # Split-screen healthcare sign-in view with platform pillars
│   └── DashboardPage.tsx        # Aggregated operational view
├── App.tsx                      # Client router (/login, /dashboard, redirects)
├── App.test.tsx                 # Automated Vitest test suite
├── index.css                    # Responsive CSS design tokens & layout rules
└── main.tsx                     # React 18 DOM root mount
```

---

## 🖥️ Screen & Module Specifications

### 1. Authentication View (`/login`)
- **Brand & Purpose:** LifeLink logo with primary tagline: *"Connecting Blood, Medicine and Care."*
- **Form Controls:** Clean Email / User ID field, password input, and explicit submit button.
- **Healthcare Visual Treatment:** Desktop right-side pane detailing key platform pillars:
  - *Real-Time ABO / Rh Blood Tracking*
  - *Essential Medicine Shortage Prevention*
  - *Emergency Mutual Aid Coordination*
- **Demo Presets:** One-click demo credential filler for academic examiners and peer review.

### 2. Main Operational Dashboard (`/dashboard`)
- **Left Sidebar Navigation:**
  - `Dashboard` (active overview)
  - `Blood Inventory` (auto-scrolls to ABO/Rh panel)
  - `Medicine Inventory` (auto-scrolls to medicine table)
  - `Requests` (staged for requisition workflow)
  - `Facilities` (staged for verified network management)
  - `Activity / Logs` (staged for audit stream)
  - `Settings` (facility configuration)
  - *Bottom:* Active user summary (`Dr. Sarah Jenkins`) and Sign Out trigger.
- **Header:**
  - Active facility badge: `City Central Blood Bank & Hospital`.
  - Notification icon with live pending alert counter.
  - Staff user avatar pill.
- **Summary Metric Cards:**
  1. *Total Blood Units:* `1,284 Units` (Optimal Aggregate)
  2. *Critical Blood Groups:* `3 Groups` (Immediate Attention)
  3. *Medicines Available:* `486 Items` (Stable Supply)
  4. *Active Requests:* `27 Requests` (6 Emergency Priority)
- **Blood Inventory Preview:**
  - Tracks all 8 standard groups: `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`.
  - Visual status meters displaying percentage of safe reserve capacity.
- **Medicine Inventory Preview Table:**
  - Columns: *Medicine*, *Category*, *Available Quantity*, *Expiry*, *Status*.
  - Features essential formulations: Paracetamol, Amoxicillin, Insulin, ORS, Epinephrine, Ceftriaxone.
  - Horizontal scrolling container (`overflow-x: auto`) ensuring mobile tablet compatibility.
- **Recent Activity Feed:**
  - Timestamped timeline with relative markers (`"10 minutes ago"`, `"32 minutes ago"`).
  - Categorized icons for requisitions, stock audits, voluntary donations, and inter-facility transfers.

---

## 📱 Responsive Layout Behavior

- **Desktop (> 1200px):** Fixed 260px deep navy sidebar, 4-column summary metric cards, 8-column blood inventory grid, and 2-column split medicine/activity layout.
- **Laptop / Tablet (641px - 1200px):** 2-column metric cards, 4-column blood inventory grid, single-column stacked medicine table and activity log.
- **Mobile (<= 640px):**
  - Sidebar collapses off-canvas into a smooth drawer toggled by the header hamburger button.
  - Stat cards stack vertically (1 column).
  - Blood groups format into a 2-column grid.
  - Medicine table permits horizontal panning without breaking viewport geometry.

---

## 🧪 Testing & Code Verification

All frontend components are verified via automated Vitest and React Testing Library tests:
- Total client tests: **6 passing suites**
- Monorepo TypeScript check: **0 errors (`tsc --noEmit`)**
- Production bundle size: **~62 kB gzipped**

