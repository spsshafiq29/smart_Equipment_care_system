# SECS — Software Architecture

> **Document Purpose:** Complete software architecture design for the Smart Equipment Care System (SECS).
> This document serves as the deferred prompt and blueprint for the system's technical architecture, component design, data flow, and deployment strategy.

---

## 1. System Overview

**SECS (Smart Equipment Care System)** is a web-based university platform for reporting, tracking, and resolving lab equipment issues with full audit transparency. The system supports four distinct staff portals (Admin, Higher Authority, Accounts, Technician) plus a public-facing student/teacher portal.

### 1.1 Key System Goals

| Goal                       | Description                                                                  |
| -------------------------- | ---------------------------------------------------------------------------- |
| **Transparency**           | Every status change, budget decision, and payment is publicly visible        |
| **Role-based workflows**   | Each role sees only what they need and can act only within their permissions  |
| **Audit trail**            | Immutable ledger for budget approvals, payments, and disputes                |
| **Real-time updates**      | Live issue tracker on landing page, instant notifications for staff          |
| **SLA enforcement**        | Auto-escalation based on priority tiers (Critical: 24h, High: 3d, Medium: 7d, Low: 14d) |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT TIER                                 │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Landing Page │  │  Auth Pages  │  │   Staff Dashboard (SPA)  │  │
│  │  (Public)     │  │  Login/Reg.  │  │  Admin | Auth | Acc | Tech│  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│         │                 │                        │                 │
│         └─────────────────┴────────────────────────┘                 │
│                           │  React 19 + Vite + Tailwind v4          │
├───────────────────────────┼─────────────────────────────────────────┤
│                    API GATEWAY / BFF                                  │
│                           │                                          │
│              ┌────────────┴────────────┐                            │
│              │    REST API (Express)    │                            │
│              │    /api/v1/*             │                            │
│              │                          │                            │
│              │  • JWT Auth Middleware   │                            │
│              │  • Role-based Guards     │                            │
│              │  • Request Validation    │                            │
│              │  • Rate Limiting         │                            │
│              └────────────┬────────────┘                            │
├───────────────────────────┼─────────────────────────────────────────┤
│                     SERVICE TIER                                     │
│                           │                                          │
│  ┌──────────┐ ┌──────────┴──┐ ┌───────────┐ ┌───────────────────┐  │
│  │ Auth     │ │ Issue       │ │ Budget    │ │ Notification      │  │
│  │ Service  │ │ Service     │ │ Service   │ │ Service           │  │
│  └────┬─────┘ └──────┬──────┘ └─────┬─────┘ └────────┬──────────┘  │
│       │              │              │                 │              │
│  ┌────┴─────┐ ┌──────┴──────┐ ┌────┴──────┐ ┌───────┴───────────┐  │
│  │ User     │ │ Lab         │ │ Audit     │ │ Email             │  │
│  │ Service  │ │ Service     │ │ Service   │ │ Service           │  │
│  └──────────┘ └─────────────┘ └───────────┘ └───────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                      DATA TIER                                       │
│                                                                     │
│  ┌──────────────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │  PostgreSQL       │  │  Redis         │  │  File Storage     │  │
│  │  (Primary DB)     │  │  (Sessions,    │  │  (Attachments)    │  │
│  │                   │  │   Cache, Queue)│  │                    │  │
│  └──────────────────┘  └────────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### 3.1 Frontend (Already Established)

| Technology        | Version | Purpose                                    |
| ----------------- | ------- | ------------------------------------------ |
| React             | 19      | UI component framework                    |
| React DOM         | 19      | DOM rendering                              |
| TypeScript        | 5.7     | Type safety                                |
| Vite              | 8       | Build tool and dev server                  |
| Tailwind CSS      | 4       | Utility-first styling via `@tailwindcss/vite` |
| React Router      | 7 (TBD) | Client-side routing (to be added)         |

### 3.2 Backend (To Be Implemented)

| Technology         | Purpose                                           |
| ------------------ | ------------------------------------------------- |
| Node.js 20 LTS     | Runtime                                           |
| Express.js 5 or Fastify 5 | HTTP framework                             |
| TypeScript 5.7     | Type safety (shared types with frontend)          |
| Prisma ORM         | Database access & migrations                      |
| PostgreSQL 16      | Primary relational database                       |
| Redis 7            | Session store, caching, background job queue      |
| BullMQ             | Job queue (email sending, SLA escalation)         |
| Zod                | Request/response validation                       |
| jsonwebtoken       | JWT signing & verification                        |
| bcrypt             | Password hashing                                  |
| Nodemailer         | Transactional emails                              |
| Socket.IO          | Real-time WebSocket events                        |
| Winston / Pino     | Structured logging                                |
| Helmet + CORS      | Security headers                                  |

### 3.3 Infrastructure

| Component       | Options                                        |
| --------------- | ---------------------------------------------- |
| Hosting         | Railway / Render / VPS                         |
| Database        | Managed PostgreSQL (Supabase / Neon / Railway) |
| File storage    | AWS S3 / Cloudflare R2 / local disk            |
| Email provider  | Resend / SendGrid / SMTP                       |
| CI/CD           | GitHub Actions                                 |

---

## 4. Project Directory Structure

```
secs/
├── client/                          # Frontend (current project)
│   ├── src/
│   │   ├── components/              # Shared UI components
│   │   │   ├── ui/                  # Button, Input, Badge, Modal, etc.
│   │   │   ├── layout/             # Navbar, Sidebar, Footer
│   │   │   └── forms/              # IssueForm, LoginForm, RegisterForm
│   │   ├── pages/                   # Route-level page components
│   │   │   ├── LandingPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── dashboard/
│   │   │       ├── OverviewPage.tsx
│   │   │       ├── ReportsPage.tsx
│   │   │       ├── LabsPage.tsx
│   │   │       ├── BudgetsPage.tsx
│   │   │       ├── UsersPage.tsx
│   │   │       └── LedgerPage.tsx
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useIssues.ts
│   │   │   └── useSocket.ts
│   │   ├── services/                # API client functions
│   │   │   ├── api.ts               # Axios/fetch instance with interceptors
│   │   │   ├── authService.ts
│   │   │   ├── issueService.ts
│   │   │   ├── labService.ts
│   │   │   ├── budgetService.ts
│   │   │   └── notificationService.ts
│   │   ├── store/                   # State management (Zustand or Context)
│   │   │   ├── authStore.ts
│   │   │   └── issueStore.ts
│   │   ├── types/                   # Shared TypeScript types
│   │   │   └── index.ts             # Moved from workflowTypes.ts
│   │   ├── utils/                   # Utility functions
│   │   ├── App.tsx                  # Router setup
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── server/                          # Backend
│   ├── src/
│   │   ├── config/                  # App config, environment variables
│   │   │   ├── database.ts
│   │   │   ├── redis.ts
│   │   │   └── env.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts              # JWT verification
│   │   │   ├── rbac.ts              # Role-based access control
│   │   │   ├── validate.ts          # Zod validation middleware
│   │   │   ├── rateLimiter.ts
│   │   │   └── errorHandler.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── issue.routes.ts
│   │   │   ├── lab.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── budget.routes.ts
│   │   │   ├── audit.routes.ts
│   │   │   ├── notification.routes.ts
│   │   │   └── dashboard.routes.ts
│   │   ├── services/
│   │   │   ├── authService.ts
│   │   │   ├── issueService.ts
│   │   │   ├── labService.ts
│   │   │   ├── userService.ts
│   │   │   ├── budgetService.ts
│   │   │   ├── auditService.ts
│   │   │   ├── notificationService.ts
│   │   │   └── emailService.ts
│   │   ├── jobs/                    # Background jobs
│   │   │   ├── slaEscalation.ts
│   │   │   └── emailQueue.ts
│   │   ├── socket/                  # WebSocket event handlers
│   │   │   └── index.ts
│   │   ├── types/                   # Shared backend types
│   │   ├── utils/
│   │   │   ├── ticketGenerator.ts   # TKT-XXXX sequential ID
│   │   │   └── emailMasker.ts
│   │   └── index.ts                 # Server entry point
│   ├── prisma/
│   │   ├── schema.prisma            # Database schema
│   │   └── seed.ts                  # Seed data for development
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                          # Shared types between client & server
│   └── types.ts
│
├── docs/                            # This documentation
└── docker-compose.yml               # Local dev (Postgres + Redis)
```

---

## 5. Database Schema (ERD)

```mermaid
erDiagram
    USER {
        string id PK
        string name
        string email UK
        string passwordHash
        string role
        string department
        string studentId
        boolean isActive
        boolean emailVerified
        datetime createdAt
        datetime updatedAt
    }

    LAB {
        string id PK
        string room UK
        string name
        string department
        string technicianId FK
        datetime createdAt
    }

    ISSUE {
        string id PK
        string labId FK
        string equipmentType
        string assetTag
        string item
        string description
        string priority
        string status
        string currentStage
        string pendingWith
        string reporterId FK
        string assignedTechnicianId FK
        int budgetAmount
        string budgetDescription
        string budgetStatus
        datetime createdAt
        datetime updatedAt
        datetime resolvedAt
    }

    BUDGET {
        string id PK
        string issueId FK
        string labName
        string purpose
        int amount
        string technicianId FK
        string status
        string approvedBy
        datetime paidAt
        datetime createdAt
    }

    AUDIT_INCIDENT {
        int id PK
        string issueId FK
        string reportedByUserId FK
        string message
        int amount
        datetime createdAt
    }

    NOTIFICATION {
        string id PK
        string userId FK
        string message
        boolean read
        string relatedIssueId FK
        datetime createdAt
    }

    ISSUE_HISTORY {
        int id PK
        string issueId FK
        string changedByUserId FK
        string action
        string fromStatus
        string toStatus
        string note
        datetime createdAt
    }

    USER ||--o{ ISSUE : "reports"
    USER ||--o{ LAB : "assigned to"
    LAB ||--o{ ISSUE : "belongs to"
    USER ||--o{ ISSUE : "assigned technician"
    ISSUE ||--o{ BUDGET : "has"
    ISSUE ||--o{ AUDIT_INCIDENT : "flagged in"
    ISSUE ||--o{ ISSUE_HISTORY : "tracked by"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ AUDIT_INCIDENT : "reported by"
    USER ||--o{ ISSUE_HISTORY : "changed by"
```

---

## 6. Workflow State Machine

The core issue lifecycle follows a strict state machine. Every transition is recorded in `ISSUE_HISTORY`.

```mermaid
stateDiagram-v2
    [*] --> UnderReview: Student submits report

    UnderReview --> Assigned: Lab coordinator reviews

    Assigned --> InProgress: Technician confirms no budget needed
    Assigned --> BudgetRequested: Technician requests budget

    BudgetRequested --> PaymentReview: Authority approves budget
    BudgetRequested --> BudgetRejected: Authority rejects budget

    BudgetRejected --> BudgetRequested: Technician re-submits
    BudgetRejected --> InProgress: Technician proceeds without budget

    PaymentReview --> FundsApproved: Accounts approves payment

    FundsApproved --> Resolved: Technician confirms repair complete
    FundsApproved --> PaymentDisputed: Technician disputes payment

    InProgress --> Resolved: Technician confirms repair complete

    PaymentDisputed --> PaymentReview: Authority re-reviews

    UnderReview --> RejectedByAuthority: Authority cancels report
    Assigned --> RejectedByAuthority: Authority cancels report
    BudgetRequested --> RejectedByAuthority: Authority cancels report

    Resolved --> [*]
    RejectedByAuthority --> [*]
```

---

## 7. Authentication & Authorization Architecture

### 7.1 Auth Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API Server
    participant DB as Database
    participant R as Redis
    participant E as Email Service

    C->>A: POST /auth/register
    A->>DB: Create user (emailVerified=false)
    A->>E: Send verification email
    A->>C: 201 Created

    C->>A: GET /auth/verify-email?token=xxx
    A->>DB: Set emailVerified=true
    A->>C: 200 OK

    C->>A: POST /auth/login
    A->>DB: Verify credentials
    A->>R: Store refresh token
    A->>C: 200 { accessToken, refreshToken }

    C->>A: GET /api/v1/issues (Authorization: Bearer xxx)
    A->>A: Verify JWT, extract role
    A->>DB: Fetch role-scoped data
    A->>C: 200 { data }
```

### 7.2 Role-Based Access Control Matrix

| Resource               | Student | Teacher | Technician | Accounts | Authority | Admin |
| ---------------------- | ------- | ------- | ---------- | -------- | --------- | ----- |
| Submit issue           | ✅      | ✅      | ❌         | ❌       | ❌        | ❌    |
| View own issues        | ✅      | ✅      | ❌         | ❌       | ❌        | ❌    |
| View public tracker    | ✅      | ✅      | ✅         | ✅       | ✅        | ✅    |
| View assigned issues   | ❌      | ❌      | ✅         | ❌       | ❌        | ❌    |
| View all issues        | ❌      | ❌      | ❌         | ❌       | ✅        | ✅    |
| Assess / complete issue| ❌      | ❌      | ✅         | ❌       | ❌        | ❌    |
| Request budget         | ❌      | ❌      | ✅         | ❌       | ❌        | ❌    |
| Approve/reject budget  | ❌      | ❌      | ❌         | ❌       | ✅        | ❌    |
| Approve payment        | ❌      | ❌      | ❌         | ✅       | ❌        | ❌    |
| Dispute payment        | ❌      | ❌      | ✅         | ❌       | ❌        | ❌    |
| Cancel report          | ❌      | ❌      | ❌         | ❌       | ✅        | ❌    |
| Manage labs            | ❌      | ❌      | ❌         | ❌       | ❌        | ✅    |
| Assign technicians     | ❌      | ❌      | ❌         | ❌       | ❌        | ✅    |
| Create staff accounts  | ❌      | ❌      | ❌         | ❌       | ✅*       | ✅    |
| Delete staff accounts  | ❌      | ❌      | ❌         | ❌       | ✅*       | ✅    |
| View audit ledger      | ✅      | ✅      | ✅         | ✅       | ✅        | ✅    |
| Publish audit concern  | ❌      | ❌      | ✅         | ❌       | ❌        | ❌    |

> *Authority can only create/delete technician and accounts roles, not admin or authority.

---

## 8. Frontend Architecture

### 8.1 Routing Plan

```
/                           → Landing page (public)
/login                      → Login page
/register                   → Registration page
/dashboard                  → Dashboard layout (auth required)
  /dashboard/overview       → Overview stats
  /dashboard/reports        → Issue workflow
  /dashboard/labs           → Lab assignments
  /dashboard/budgets        → Budgets & payments
  /dashboard/users          → User accounts (admin/authority)
  /dashboard/ledger         → Public audit ledger
```

### 8.2 State Management

| State category    | Solution                    | Scope                          |
| ----------------- | --------------------------- | ------------------------------ |
| Auth state        | Zustand store + localStorage | Global, persisted              |
| Server data       | React Query (TanStack Query) | Per-component, cached          |
| UI state          | React useState / useReducer  | Component-local               |
| Real-time events  | Socket.IO client + Zustand   | Global, pushed from server     |

### 8.3 Component Hierarchy

```
App
├── LandingPage
│   ├── Navbar
│   ├── HeroSection
│   ├── PortalAccessSection
│   ├── HowItWorksSection
│   ├── LabDirectorySection
│   ├── SubmitIssueForm
│   ├── PublicIssueTracker
│   ├── FAQSection
│   └── Footer
├── LoginPage
├── RegisterPage
└── DashboardLayout (protected)
    ├── Sidebar (role-aware nav)
    ├── Header (notifications, search, role switcher)
    └── <Outlet>
        ├── OverviewPage
        ├── ReportsPage
        │   └── IssueCard (with role-specific action panels)
        ├── LabsPage
        │   └── LabAssignmentCard
        ├── BudgetsPage
        │   └── BudgetRow
        ├── UsersPage
        │   └── UserAccountRow + CreateAccountForm
        └── LedgerPage
            └── AuditIncidentCard
```

---

## 9. Security Architecture

| Layer              | Measure                                                     |
| ------------------ | ----------------------------------------------------------- |
| **Transport**      | HTTPS only (TLS 1.3)                                       |
| **Auth tokens**    | Short-lived JWT (1hr), httpOnly refresh token cookie        |
| **Password**       | bcrypt with cost factor 12                                  |
| **Input**          | Zod validation on every endpoint, SQL injection via Prisma ORM |
| **Headers**        | Helmet.js (CSP, HSTS, X-Frame-Options, etc.)               |
| **CORS**           | Whitelist only the frontend origin                          |
| **Rate limiting**  | 60 req/min per token; 10 req/min for auth endpoints         |
| **Email privacy**  | Reporter emails masked in public responses (`ab***@uitc.edu`) |
| **Audit identity** | Technician disputes are published anonymously (role-only)   |
| **Data access**    | Row-level security via service layer (role-scoped queries)  |

---

## 10. Real-time Architecture

```mermaid
sequenceDiagram
    participant T as Technician
    participant API as API Server
    participant WS as Socket.IO
    participant S as Student Dashboard
    participant LP as Landing Page

    T->>API: PATCH /issues/TKT-2891/status (complete)
    API->>API: Update DB, create history record
    API->>WS: Emit "issue.status_changed"
    WS->>S: Push status update (if subscribed)
    WS->>LP: Push to public tracker
```

**Socket rooms:**
- `issue:<ticketId>` — Reporter + assigned technician
- `role:<roleName>` — All users of a specific role
- `lab:<labId>` — Staff assigned to that lab
- `public` — Landing page live tracker

---

## 11. SLA Escalation System

| Priority | Initial deadline | Escalation action                               |
| -------- | ---------------- | ----------------------------------------------- |
| Critical | 24 hours         | Auto-notify Authority + Admin                   |
| High     | 3 days           | Auto-notify Authority                           |
| Medium   | 7 days           | Auto-notify Admin                               |
| Low      | 14 days          | Auto-change status to `"SLA Breached"`          |

**Implementation:** BullMQ scheduled job runs hourly, checks open issues against their SLA deadline, and triggers notifications and status changes.

---

## 12. Deployment Architecture

```
                    ┌──────────────────────┐
                    │   Cloudflare / CDN   │
                    │   (Static assets)    │
                    └──────────┬───────────┘
                               │
                    ┌──────────┴───────────┐
                    │   Reverse Proxy      │
                    │   (Nginx / Caddy)    │
                    └──────────┬───────────┘
                               │
                ┌──────────────┴──────────────┐
                │                              │
        ┌───────┴───────┐             ┌───────┴───────┐
        │ Frontend (SPA) │             │ API Server    │
        │ Vite build     │             │ Node.js       │
        │ /dist          │             │ Port 3000     │
        └───────────────┘             └───────┬───────┘
                                              │
                              ┌───────────────┼───────────────┐
                              │               │               │
                      ┌───────┴──┐    ┌───────┴──┐    ┌───────┴──┐
                      │PostgreSQL│    │  Redis   │    │  S3/R2   │
                      │Port 5432 │    │Port 6379 │    │ Storage  │
                      └──────────┘    └──────────┘    └──────────┘
```

---

## 13. Development Workflow

### 13.1 Local Setup

```bash
# Clone and install
git clone <repo>
cd secs

# Frontend
cd client && pnpm install && pnpm dev

# Backend
cd server && pnpm install
docker compose up -d   # Postgres + Redis
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev
```

### 13.2 Environment Variables

```env
# Server
DATABASE_URL=postgresql://user:pass@localhost:5432/secs
REDIS_URL=redis://localhost:6379
JWT_SECRET=<random-256-bit>
JWT_REFRESH_SECRET=<random-256-bit>
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_xxx
FRONTEND_URL=http://localhost:5173
PORT=3000

# Client
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=http://localhost:3000
```

---

## 14. Implementation Phases

### Phase 1 — Foundation (Week 1-2)
- [ ] Set up monorepo structure (client + server)
- [ ] Backend project scaffolding with Express/Fastify + TypeScript
- [ ] Database schema with Prisma, initial migration
- [ ] Auth system (register, login, JWT, refresh, email verify)
- [ ] Role-based middleware
- [ ] Seed data matching current frontend mock data

### Phase 2 — Core CRUD (Week 3-4)
- [ ] Issue CRUD endpoints with full workflow state machine
- [ ] Lab management endpoints
- [ ] User/staff account management endpoints
- [ ] Budget workflow endpoints
- [ ] Connect frontend to real API (replace all hardcoded data)
- [ ] React Router setup, split monolithic components into pages

### Phase 3 — Real-time & Notifications (Week 5)
- [ ] Socket.IO integration for live status updates
- [ ] In-app notification system
- [ ] Email notifications (ticket created, status changed, budget approved)
- [ ] SLA escalation background job

### Phase 4 — Audit & Polish (Week 6)
- [ ] Public audit ledger with anonymous dispute publishing
- [ ] Issue history timeline (every status change recorded)
- [ ] File attachment support for issue reports
- [ ] Search and filtering improvements
- [ ] Error handling and loading states across all pages

### Phase 5 — Deployment & Testing (Week 7-8)
- [ ] Integration tests for all API endpoints
- [ ] E2E tests for critical workflows
- [ ] Docker containerization
- [ ] CI/CD pipeline
- [ ] Production deployment
- [ ] Performance monitoring setup

