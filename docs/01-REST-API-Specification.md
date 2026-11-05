# SECS — REST API Specification

> **Document Purpose:** Complete REST API design for the Smart Equipment Care System (SECS).
> This document serves as the deferred prompt and blueprint for implementing the backend API layer.

---

## 1. API Overview

| Property            | Value                                          |
| ------------------- | ---------------------------------------------- |
| Base URL            | `/api/v1`                                      |
| Auth mechanism      | JWT (access + refresh tokens)                  |
| Content type        | `application/json`                             |
| Date format         | ISO 8601 (`2026-03-18T09:42:00+06:00`)         |
| Currency            | BDT (৳), stored as integer paisa internally    |
| Pagination default  | `?page=1&limit=20`                             |
| Rate limiting       | 60 requests / minute per token                 |

---

## 2. Authentication & Authorization

### 2.1 Roles

| Role          | Code         | Description                                                              |
| ------------- | ------------ | ------------------------------------------------------------------------ |
| Student       | `student`    | Submit issues, track own tickets, view public tracker                    |
| Teacher       | `teacher`    | Same as student (may later get lab-head privileges)                      |
| Researcher    | `researcher` | Same as student                                                          |
| Technician    | `technician` | Manage assigned-lab issues, request budgets, dispute payments            |
| Accounts      | `accounts`   | View approved budgets, confirm payments                                  |
| Authority     | `authority`  | Approve/reject budgets, cancel reports, create staff accounts            |
| Admin         | `admin`      | Full access — lab assignments, account management, system configuration  |

### 2.2 Endpoints

#### `POST /api/v1/auth/register`

Register a new public user (student / teacher / researcher).

**Request body:**
```json
{
  "fullName": "Abir Talukdar",
  "studentId": "0432320005101078",
  "email": "a.talukdar@uitc.edu",
  "department": "Computer Science & Engineering",
  "role": "student",
  "password": "SecureP@ss1"
}
```

**Validation rules:**
- `email` must end with `.edu`
- `password` ≥ 8 characters
- `role` must be one of `student | teacher | researcher`

**Response `201 Created`:**
```json
{
  "message": "Verification link sent to a.talukdar@uitc.edu",
  "userId": "usr_abc123"
}
```

---

#### `POST /api/v1/auth/login`

**Request body:**
```json
{
  "email": "ashik.rahman@uitc.edu",
  "password": "SecureP@ss1",
  "portal": "technician"
}
```

**Response `200 OK`:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 3600,
  "user": {
    "id": "usr_tech1",
    "name": "Ashik Rahman",
    "email": "ashik.rahman@uitc.edu",
    "role": "technician",
    "assignedLabs": ["lab-1", "lab-2"]
  }
}
```

---

#### `POST /api/v1/auth/refresh`

**Request body:**
```json
{ "refreshToken": "eyJ..." }
```

**Response `200 OK`:**
```json
{
  "accessToken": "eyJ...",
  "expiresIn": 3600
}
```

---

#### `POST /api/v1/auth/verify-email`

**Query:** `?token=<verification_token>`

---

#### `POST /api/v1/auth/forgot-password`

**Request body:**
```json
{ "email": "user@uitc.edu" }
```

---

#### `POST /api/v1/auth/reset-password`

**Request body:**
```json
{
  "token": "<reset_token>",
  "newPassword": "NewSecure1!"
}
```

---

## 3. Issues (Equipment Problem Reports)

### 3.1 Data Model

```typescript
interface Issue {
  id: string;                        // "TKT-2891"
  lab: string;                       // "CSE-402 · Networking Lab"
  labId: string;                     // "lab-1"
  item: string;                      // "Cisco Switch SW-08"
  equipmentType: string;             // "Lab Computer / Workstation"
  assetTag?: string;                 // "LAB-0042"
  description: string;               // Free-text description
  priority: "low" | "medium" | "high" | "critical";
  status: IssueStatus;
  currentStage: string;              // Human-readable stage description
  pendingWith: string;               // Name or office currently responsible
  reporterId: string;
  reporterEmail: string;             // Masked in public responses
  assignedTechnicianId: string;
  budgetAmount?: number;             // In BDT
  budgetDescription?: string;
  budgetStatus?: BudgetFlowStatus;
  createdAt: string;                 // ISO 8601
  updatedAt: string;
  resolvedAt?: string;
}

type IssueStatus =
  | "Under Review"
  | "Assigned"
  | "In Progress"
  | "Budget Requested"
  | "Budget Rejected"
  | "Payment Review"
  | "Funds Approved"
  | "Payment Disputed"
  | "Resolved"
  | "Rejected by Higher Authority";

type BudgetFlowStatus =
  | "Pending Higher Authority"
  | "Rejected by Higher Authority"
  | "Approved by Higher Authority"
  | "Payment approved by Accounts";
```

### 3.2 Endpoints

#### `POST /api/v1/issues` — Submit a new issue

**Auth:** Student / Teacher / Researcher

**Request body:**
```json
{
  "labId": "lab-1",
  "equipmentType": "Lab Computer / Workstation",
  "assetTag": "PC-07",
  "description": "Monitor flickers intermittently after 10 minutes of use.",
  "priority": "medium"
}
```

**Response `201 Created`:**
```json
{
  "id": "TKT-2892",
  "status": "Under Review",
  "currentStage": "Awaiting lab review",
  "pendingWith": "Ashik Rahman",
  "assignedTechnicianId": "tech-1",
  "createdAt": "2026-03-19T14:30:00+06:00"
}
```

**Auto-assignment logic:**
The system assigns the technician currently mapped to the selected lab. If no technician is assigned to the lab, `pendingWith` is set to `"Lab Coordinator"` and status becomes `"Under Review"`.

---

#### `GET /api/v1/issues` — List issues

**Auth:** All authenticated users (scoped by role)

| Query param    | Type     | Description                                         |
| -------------- | -------- | --------------------------------------------------- |
| `page`         | integer  | Page number (default 1)                             |
| `limit`        | integer  | Items per page (default 20, max 100)                |
| `status`       | string   | Filter by status                                    |
| `priority`     | string   | Filter by priority                                  |
| `labId`        | string   | Filter by lab                                       |
| `technicianId` | string   | Filter by assigned technician                       |
| `search`       | string   | Search by ticket ID                                 |
| `sortBy`       | string   | `createdAt` (default), `priority`, `status`         |
| `order`        | string   | `desc` (default), `asc`                             |

**Role-based scoping:**
- **Student/Teacher/Researcher:** Only own submitted issues (full detail) + public tracker (masked emails)
- **Technician:** Only issues assigned to their labs
- **Accounts:** Only issues with `budgetStatus === "Approved by Higher Authority"`
- **Authority / Admin:** All issues

**Response `200 OK`:**
```json
{
  "data": [ /* array of Issue objects */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 143,
    "totalPages": 8
  }
}
```

---

#### `GET /api/v1/issues/:id` — Get single issue detail

**Auth:** Owner, assigned technician, admin, authority, accounts (if budget-related)

---

#### `GET /api/v1/issues/public` — Public issue tracker

**Auth:** None (public endpoint)

Returns all issues with masked reporter emails. Used by the landing page transparency tracker.

---

#### `PATCH /api/v1/issues/:id/status` — Update issue status

**Auth:** Role-dependent (see action matrix below)

**Request body:**
```json
{
  "action": "confirm_no_budget",
  "note": "Optional note about the action"
}
```

**Available actions by role:**

| Action                    | Allowed role(s) | Sets status to             | Sets pendingWith to       |
| ------------------------- | --------------- | -------------------------- | ------------------------- |
| `confirm_no_budget`       | technician      | `In Progress`              | Assigned technician       |
| `request_budget`          | technician      | `Budget Requested`         | `Higher Authority`        |
| `approve_budget`          | authority       | `Payment Review`           | `Accounts Office`         |
| `reject_budget`           | authority       | `Budget Rejected`          | Assigned technician       |
| `cancel_report`           | authority       | `Rejected by Higher Auth.` | `Closed`                  |
| `approve_payment`         | accounts        | `Funds Approved`           | Assigned technician       |
| `complete_repair`         | technician      | `Resolved`                 | `Closed`                  |
| `dispute_payment`         | technician      | `Payment Disputed`         | `Higher Authority`        |

**Additional fields for `request_budget`:**
```json
{
  "action": "request_budget",
  "budgetAmount": 32000,
  "budgetDescription": "Replacement motor, coupling and installation cost."
}
```

**Additional fields for `dispute_payment`:**
```json
{
  "action": "dispute_payment",
  "disputeMessage": "Accounts marked this payment as approved, but funds were not received."
}
```

---

## 4. Labs

### 4.1 Data Model

```typescript
interface Lab {
  id: string;             // "lab-1"
  room: string;           // "CSE-402"
  name: string;           // "Networking Lab"
  department: string;     // "Computer Science"
  technicianId: string | null;
  openIssues: number;
}
```

### 4.2 Endpoints

#### `GET /api/v1/labs` — List all labs

**Auth:** All authenticated users

**Query params:** `?department=CSE&hasTechnician=true`

---

#### `GET /api/v1/labs/:id` — Get lab detail

**Auth:** All authenticated users

---

#### `POST /api/v1/labs` — Create a new lab

**Auth:** Admin only

**Request body:**
```json
{
  "room": "ME-107",
  "name": "Fluid Mechanics Lab",
  "department": "Mechanical Engineering",
  "technicianId": null
}
```

---

#### `PATCH /api/v1/labs/:id` — Update lab (including technician assignment)

**Auth:** Admin only

**Request body:**
```json
{ "technicianId": "tech-2" }
```

---

#### `DELETE /api/v1/labs/:id` — Remove a lab

**Auth:** Admin only

---

## 5. Users & Staff Accounts

### 5.1 Data Model

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: "student" | "teacher" | "researcher" | "technician" | "accounts" | "authority" | "admin";
  department?: string;
  studentId?: string;
  assignedLabs?: string[];     // Only for technicians
  isActive: boolean;
  createdAt: string;
}
```

### 5.2 Endpoints

#### `GET /api/v1/users` — List all users

**Auth:** Admin, Authority

**Query params:** `?role=technician&isActive=true&page=1&limit=20`

---

#### `GET /api/v1/users/me` — Get current user profile

**Auth:** Any authenticated user

---

#### `POST /api/v1/users` — Create a staff account

**Auth:** Admin (all roles), Authority (technician, accounts only)

**Request body:**
```json
{
  "name": "New Technician",
  "email": "new.tech@uitc.edu",
  "role": "technician",
  "assignLabId": "lab-6"
}
```

**Business rules:**
- Authority cannot create admin or authority accounts
- Creating a technician with `assignLabId` also updates that lab's `technicianId`
- A secure activation link is emailed to the new user

---

#### `PATCH /api/v1/users/:id` — Update user

**Auth:** Admin, Authority (limited), or self (profile fields only)

---

#### `DELETE /api/v1/users/:id` — Deactivate/remove user

**Auth:** Admin (all), Authority (technician/accounts only)

**Business rules:**
- Primary admin account (`admin-1`) cannot be removed
- Authority accounts can only be removed by Admin
- Removing a technician unassigns them from all labs and re-routes pending issues to `"System Admin"`

---

## 6. Budgets

### 6.1 Data Model

```typescript
interface Budget {
  id: string;              // "BGT-1048"
  ticketId: string;        // "TKT-2891"
  labName: string;
  purpose: string;
  amount: number;          // BDT
  technicianId: string;
  status: "Pending approval" | "Approved" | "Payment confirmed";
  approvedBy?: string;
  paidAt?: string;         // ISO 8601
  createdAt: string;
}
```

### 6.2 Endpoints

#### `GET /api/v1/budgets` — List budgets

**Auth:** All staff roles (scoped)
- **Technician:** Only budgets where `technicianId` matches
- **Accounts:** All budgets with status `Approved` or `Payment confirmed`
- **Authority / Admin:** All budgets

---

#### `GET /api/v1/budgets/:id` — Get budget detail

---

#### `PATCH /api/v1/budgets/:id/approve` — Approve a budget

**Auth:** Authority

**Side effects:**
- Sets `status` to `"Approved"`, records `approvedBy`
- Updates linked issue status to `"Payment Review"`

---

#### `PATCH /api/v1/budgets/:id/confirm-payment` — Confirm payment

**Auth:** Accounts

**Side effects:**
- Sets `status` to `"Payment confirmed"`, records `paidAt`
- Updates linked issue status to `"Funds Approved"`
- Creates audit trail entry visible on public ledger

---

## 7. Audit Ledger (Public Incidents)

### 7.1 Data Model

```typescript
interface AuditIncident {
  id: number;
  ticketId: string;
  message: string;
  amount?: number;
  reportedByRole: string;     // Role only, name hidden publicly
  createdAt: string;
}
```

### 7.2 Endpoints

#### `GET /api/v1/audit/incidents` — List public audit incidents

**Auth:** Public (landing page) or any authenticated user

---

#### `POST /api/v1/audit/incidents` — Report payment concern

**Auth:** Technician only

**Request body:**
```json
{
  "ticketId": "TKT-2884",
  "message": "Accounts marked this payment as approved, but the technician reported that the funds were not received.",
  "amount": 8900
}
```

**Side effects:**
- Linked issue status changes to `"Payment Disputed"`
- Reporter identity is hidden in public-facing responses (only "Technician" is shown)

---

## 8. Notifications

### 8.1 Endpoints

#### `GET /api/v1/notifications` — Get user notifications

**Auth:** Any authenticated user

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "notif-1",
      "message": "Higher Authority approved TKT-2891 budget of ৳18,500.",
      "read": false,
      "createdAt": "2026-03-18T14:00:00+06:00"
    }
  ],
  "unreadCount": 3
}
```

---

#### `PATCH /api/v1/notifications/:id/read` — Mark notification as read

---

#### `PATCH /api/v1/notifications/read-all` — Mark all as read

---

## 9. Dashboard Statistics

#### `GET /api/v1/dashboard/stats` — Get dashboard overview stats

**Auth:** All staff roles (response scoped by role)

**Response `200 OK`:**
```json
{
  "registeredLabs": 6,
  "openIssues": 15,
  "approvedBudgetTotal": 72150,
  "publicConcerns": 1,
  "pendingPayments": 1,
  "staffAccounts": 28
}
```

---

## 10. Error Response Format

All error responses use a consistent envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Enter a valid university .edu email address.",
    "details": [
      { "field": "email", "message": "Only university .edu email addresses are accepted." }
    ]
  }
}
```

### Standard Error Codes

| HTTP Status | Code                   | When                                    |
| ----------- | ---------------------- | --------------------------------------- |
| 400         | `VALIDATION_ERROR`     | Invalid request body or query params    |
| 401         | `UNAUTHORIZED`         | Missing or expired token                |
| 403         | `FORBIDDEN`            | User lacks permission for this action   |
| 404         | `NOT_FOUND`            | Resource does not exist                 |
| 409         | `CONFLICT`             | Duplicate email, already-actioned item  |
| 429         | `RATE_LIMITED`         | Too many requests                       |
| 500         | `INTERNAL_ERROR`       | Unexpected server error                 |

---

## 11. Webhook / Real-time Events (Future)

For real-time status updates on the landing-page tracker and dashboard notifications:

| Event name              | Payload includes | Triggered when                          |
| ----------------------- | ---------------- | --------------------------------------- |
| `issue.created`         | Issue ID, lab    | New issue submitted                     |
| `issue.status_changed`  | Issue ID, new status, pendingWith | Any status transition     |
| `budget.approved`       | Budget ID, amount | Authority approves budget              |
| `payment.confirmed`     | Budget ID, amount | Accounts confirms payment              |
| `payment.disputed`      | Incident ID      | Technician disputes payment             |

Delivery: WebSocket (Socket.IO) or Server-Sent Events (SSE).

---

## 12. Implementation Checklist

- [ ] Set up Express.js / Fastify project with TypeScript
- [ ] Implement JWT auth middleware with role-based guards
- [ ] Create database migrations for all models
- [ ] Implement all CRUD endpoints listed above
- [ ] Add request validation (Zod or Joi)
- [ ] Add pagination helper
- [ ] Implement email service (registration verification, password reset, ticket confirmation)
- [ ] Add rate limiting middleware
- [ ] Write integration tests for each endpoint
- [ ] Set up WebSocket/SSE for real-time notifications
- [ ] Document API with Swagger/OpenAPI spec

