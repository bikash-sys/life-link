# LifeLink — Community Blood and Essential Medicine Availability Network

[![Repository Status](https://img.shields.io/badge/Status-Foundation%20Phase-blue.svg)](https://github.com/bikash-sys/life-link)
[![Git Workflow](https://img.shields.io/badge/Git%20Branch-main%20direct-orange.svg)](https://github.com/bikash-sys/life-link)
[![Node Version](https://img.shields.io/badge/Node-v20.x-green.svg)](https://nodejs.org/)

LifeLink is a centralized, community-driven availability network designed to connect individuals, healthcare providers, and pharmacies with reported availability of blood components and essential life-saving medicines.

---

> ### ⚠️ Critical Medical Safety & Legal Notice
> - **Reported Availability Only:** LifeLink displays reported facility availability. It **does not guarantee** physical in-stock status or reserve stock indefinitely.
> - **Emergency Services:** In critical life-threatening situations, always contact authorized emergency response services directly.
> - **Clinical Assessment:** Blood component compatibility metrics presented within LifeLink are informational references and **must never replace** laboratory cross-matching, antibody screening, or clinical transfusion judgment.
> - **Privacy:** Only synthetic demonstration data is used. Zero real patient PII is stored.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, React Router, Vanilla Modern CSS |
| **Backend** | Node.js, Express, TypeScript, Zod Validation, REST APIs |
| **Database** | PostgreSQL, Prisma ORM, Raw SQL Analytics |
| **Testing** | Vitest, Supertest, React Testing Library |
| **Tooling** | Concurrently, TSX, Strict TypeScript |

---

## 📂 Monorepo Structure

```text
life-link/
├── client/                      # React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx              # LifeLink base view
│   │   ├── index.css            # Curated modern CSS tokens
│   │   └── main.tsx             # React entry point
│   └── vite.config.ts
├── server/                      # Express + TypeScript backend API
│   ├── src/
│   │   ├── app.ts               # Express configuration & health endpoints
│   │   └── index.ts             # Server entry point (port 5000)
│   └── tests/                   # Vitest & Supertest API tests
├── database/                    # Database coursework & scripts
│   ├── seeds/                   # Synthetic seed data SQL scripts
│   └── queries/                 # Advanced analytics & window function queries
├── docs/                        # Academic and design documentation
│   ├── academic/
│   │   └── scope_proposal.md    # AP & DE 100% scope proposals
│   └── database/
│       └── draft_er_diagram.md  # Preliminary draft ER diagram
├── .env.example                 # Environment variable templates
├── .gitignore                   # Monorepo ignore rules
├── package.json                 # Monorepo root workspace configuration
└── README.md                    # Primary documentation (this file)
```

---

## 🤝 Two-Developer Collaboration Workflow

We operate under a **direct-to-main** repository policy with strict safety guidelines:

### Strict Repository Rules
1. **Single Branch:** Both developers work directly on the `main` branch of `https://github.com/bikash-sys/life-link.git`.
2. **No Feature Branches / PRs:** Do not create feature branches, pull requests, or GitHub issues.
3. **No Force-Pushes:** `git push --force` or `--force-with-lease` is strictly prohibited.
4. **Pull Before Pushing:** Always run `git pull --rebase` or `git pull` and verify local tests pass before pushing.
5. **Conflict Reconciliation:** If the remote contains new commits, fetch and reconcile safely without overwriting each other's work.
6. **No Secrets in Git:** Never commit passwords, `.env` files, database credentials, or API keys.
7. **Attribution:** Each developer commits using their own configured Git identity (`name` and `email`).

### Division of Responsibilities

- **Developer A:**
  - Authentication, JWT, and Role-Based Access Control (RBAC).
  - Blood compatibility matching algorithms and validation.
  - Requisition and reservation lifecycle workflows.
  - Multi-criteria search APIs and UI integration.
  - Related automated integration tests and documentation.

- **Developer B:**
  - Facility profiles, verification status, and management APIs.
  - Blood component and medicine batch inventory management.
  - Atomic stock reservations and race-condition prevention.
  - Synthetic data generation and SQL data-quality audit scripts.
  - Advanced SQL queries (window functions, expiry FIFO, shortage analytics).

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js:** `v20.x` or higher
- **npm:** `v10.x` or higher

### 2. Installation
Install all root, client, and server dependencies in one command:
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to create your local environment file:
```bash
cp .env.example .env
```
*(Ensure `.env` remains uncommitted and gitignored).*

### 4. Running the Development Environment
Run both backend and frontend concurrently:
```bash
npm run dev
```

Or run services independently:
```bash
# Run server API only (http://localhost:5000)
npm run dev:server

# Run frontend client only (http://localhost:5173)
npm run dev:client
```

### 5. Running Automated Tests & Type Checks
```bash
# Run all unit and integration tests
npm run test

# Run TypeScript type check across monorepo
npm run typecheck

# Run production builds
npm run build
```

---

## 📖 Academic Documentation Links
- [Academic Scope Proposal (AP & DE Checklists)](docs/academic/scope_proposal.md)
- [Preliminary Draft ER Diagram](docs/database/draft_er_diagram.md)
