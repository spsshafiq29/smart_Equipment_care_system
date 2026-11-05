# SECS — Project Requirements & Supplementary Information

> **Document Purpose:** All remaining specifications, business rules, UI/UX requirements, data seeding, and information needed to fully implement the Smart Equipment Care System (SECS).
> This is the companion document to the REST API spec and Software Architecture docs.

---

## 1. Business Context

### 1.1 Project Identity

| Property          | Value                                                    |
| ----------------- | -------------------------------------------------------- |
| Full name         | Smart Equipment Care System                              |
| Acronym           | SECS                                                     |
| University        | UITC University                                          |
| Primary color     | `#d4550a` (burnt orange)                                 |
| Accent color      | `#eab308` / amber-400 (staff portals)                    |
| Dark background   | `#070f20` → `#0a1628` gradient                           |
| Font display      | CSS variable `var(--font-display)` (system or Inter-like)|
| Logo mark         | Orange rounded square with bold "S"                      |
| Currency          | BDT (৳ — Bangladeshi Taka)                               |
| Email domain      | `@uitc.edu`                                              |

### 1.2 Target Users

| User type            | How they access                         | Primary actions                                   |
| -------------------- | --------------------------------------- | ------------------------------------------------- |
| **Students**         | Register → public portal                | Submit issue reports, track own tickets            |
| **Teachers**         | Register → public portal                | Same as student                                   |
| **Researchers**      | Register → public portal                | Same as student                                   |
| **Lab Technicians**  | Account created by admin/authority      | Assess reports, request budgets, complete repairs  |
| **Accounts Officer** | Account created by admin/authority      | Approve payments for authority-approved budgets    |
| **Higher Authority** | Account created by admin                | Approve/reject budgets, cancel reports, oversight  |
| **System Admin**     | Pre-seeded or created by another admin  | Full system control — labs, users, assignments     |

---

## 2. Seed Data (Development & Demo)

### 2.1 Staff Accounts

| ID            | Name             | Email                       | Role        | Password (dev) |
| ------------- | ---------------- | --------------------------- | ----------- | -------------- |
| `admin-1`     | Mahmud Kabir     | mahmud.kabir@uitc.edu       | admin       | `Admin@123`    |
| `authority-1` | Dr. Samina Haque | samina.haque@uitc.edu       | authority   | `Auth@123`     |
| `accounts-1`  | Nusrat Islam     | nusrat.islam@uitc.edu       | accounts    | `Acct@123`     |
| `tech-1`      | Ashik Rahman     | ashik.rahman@uitc.edu       | technician  | `Tech@123`     |
| `tech-2`      | Farhana Islam    | farhana.islam@uitc.edu      | technician  | `Tech@123`     |
| `tech-3`      | Nayeem Hasan     | nayeem.hasan@uitc.edu       | technician  | `Tech@123`     |
| `tech-4`      | Sadia Karim      | sadia.karim@uitc.edu        | technician  | `Tech@123`     |

### 2.2 Labs

| ID     | Room     | Name                       | Department              | Technician   | Open Issues |
| ------ | -------- | -------------------------- | ----------------------- | ------------ | ----------- |
| lab-1  | CSE-402  | Networking Lab             | Computer Science        | tech-1       | 4           |
| lab-2  | EEE-205  | Electronics Lab            | Electrical Engineering  | tech-1       | 2           |
| lab-3  | PHY-301  | Optics Lab                 | Physics                 | tech-2       | 1           |
| lab-4  | CHEM-110 | Analytical Chemistry Lab   | Chemistry               | tech-3       | 3           |
| lab-5  | BIO-214  | Molecular Biology Lab      | Biology                 | tech-4       | 0           |
| lab-6  | ME-106   | Thermodynamics Lab         | Mechanical Engineering  | *(none)*     | 5           |

### 2.3 Sample Issues

| Ticket    | Lab         | Equipment                 | Status           | Priority | Budget (৳) | Budget Status               |
| --------- | ----------- | ------------------------- | ---------------- | -------- | ---------- | ---------------------------- |
| TKT-2891  | CSE-402     | Cisco Switch SW-08        | Assigned         | High     | —          | —                            |
| TKT-2890  | BIO-214     | Centrifuge C-14           | Resolved         | Medium   | —          | —                            |
| TKT-2887  | CHEM-110    | Fume Hood Fan             | Budget Requested | High     | 32,000     | Pending Higher Authority     |
| TKT-2884  | EEE-205     | Workstation PC-07         | Resolved         | Low      | —          | —                            |
| TKT-2881  | EEE-205     | Oscilloscope power module | Payment Review   | Medium   | 12,750     | Approved by Higher Authority |

### 2.4 Sample Budgets

| ID        | Ticket    | Lab                      | Purpose                      | Amount (৳) | Status             | Approved by         |
| --------- | --------- | ------------------------ | ---------------------------- | ---------- | ------------------ | ------------------- |
| BGT-1048  | TKT-2891  | Networking Lab           | Cisco switch power module    | 18,500     | Approved           | Dr. Samina Haque    |
| BGT-1047  | TKT-2887  | Analytical Chemistry Lab | Fume hood motor repair       | 32,000     | Pending approval   | —                   |
| BGT-1042  | TKT-2879  | Optics Lab               | Laser alignment kit          | 12,750     | Payment confirmed  | Dr. Samina Haque    |
| BGT-1039  | TKT-2864  | Electronics Lab          | Oscilloscope probe set       | 8,900      | Payment confirmed  | Dr. Samina Haque    |

### 2.5 Sample Audit Incident

| ID | Ticket    | Message                                                                                          | Amount (৳) |
| -- | --------- | ------------------------------------------------------------------------------------------------ | ---------- |
| 1  | TKT-2884  | Accounts marked this payment as approved, but the technician reported that funds were not received. | 8,900     |

---

## 3. Equipment Categories

The system supports these equipment types (used in issue submission):

| Icon | Category            |
| ---- | ------------------- |
| 🔬   | Microscopes         |
| ⚗️   | Centrifuges         |
| 💻   | Lab Computers       |
| 📡   | Oscilloscopes       |
| 🧪   | Spectrophotometers  |
| 🔋   | Power Supplies      |
| 🌡️   | Autoclaves          |
| 📷   | Imaging Systems     |
| —    | Fume Hood           |
| —    | Other               |

---

## 4. University Departments

Used in registration and lab assignment:

1. Computer Science & Engineering
2. Electrical & Electronic Engineering
3. Mechanical Engineering
4. Civil Engineering
5. Physics
6. Chemistry
7. Biology & Biotechnology
8. Business Administration
9. Other

---

## 5. SLA (Service Level Agreement) Tiers

| Priority | Color       | Max response time | Auto-escalation target |
| -------- | ----------- | ----------------- | ---------------------- |
| Critical | Red `#ef4444`| 24 hours          | Authority + Admin     |
| High     | Orange `#f97316` | 3 days        | Authority             |
| Medium   | Yellow `#eab308` | 7 days        | Admin                 |
| Low      | Green `#22c55e`  | 14 days       | Status update only    |

---

## 6. Ticket ID Generation

- Format: `TKT-XXXX` (4+ digit sequential number)
- Budget format: `BGT-XXXX`
- Both must be globally unique and monotonically increasing
- Implementation: Database sequence or auto-increment with formatted prefix

---

## 7. Email Templates

### 7.1 Required Emails

| Trigger                    | Recipient          | Subject line                                  |
| -------------------------- | ------------------ | --------------------------------------------- |
| Registration               | New user           | "Verify your SECS account"                    |
| Password reset             | User               | "Reset your SECS password"                    |
| Issue submitted            | Reporter           | "Your report TKT-XXXX has been received"      |
| Issue assigned             | Technician         | "New report assigned: TKT-XXXX"               |
| Budget approved            | Technician         | "Budget approved for TKT-XXXX"                |
| Budget rejected            | Technician         | "Budget rejected for TKT-XXXX"                |
| Payment approved           | Technician         | "Payment approved for TKT-XXXX"               |
| Issue resolved             | Reporter           | "Your equipment has been repaired: TKT-XXXX"  |
| Payment disputed           | Authority + Admin  | "⚠ Payment concern raised for TKT-XXXX"       |
| SLA breach                 | Authority / Admin  | "⚠ SLA breach: TKT-XXXX overdue"              |
| Account created            | New staff member   | "Your SECS staff account is ready"             |

### 7.2 Email Privacy Rules

- Reporter emails are always masked in public-facing views: `ab***@uitc.edu`
- Masking formula: show first 2 characters of local part + `***@domain`
- Staff emails are visible within the dashboard but not on the public tracker

---

## 8. Public Landing Page Sections

The landing page must include these sections (already implemented in frontend):

| Section               | Anchor ID        | Description                                         |
| --------------------- | ---------------- | --------------------------------------------------- |
| Hero                  | `#home`          | Full-screen hero with stats, CTA, and lab image     |
| Announcement banner   | *(fixed)*        | Maintenance notices (admin-editable in future)       |
| Staff portal access   | `#portal-access` | 4 portal cards with demo access buttons             |
| How it works          | `#how`           | 4-step process explanation                           |
| Lab directory         | `#labs`          | Room grid + equipment type icons                     |
| Submit issue form     | `#submit`        | Public submission form (auth required for API)       |
| Live issue tracker    | `#track`         | Real-time public table with search                   |
| FAQ                   | `#faq`           | Accordion-style Q&A                                  |
| Footer                | *(bottom)*       | Copyright, links                                     |

---

## 9. Dashboard Sections (Per Role)

### 9.1 Overview (All Roles)

Shows 4 stat cards:
- Registered / assigned labs count
- Open equipment issues count
- Approved budget total (৳)
- Public concerns count

Plus: "Labs needing attention" list and "Audit coverage" checklist.

### 9.2 Issue Workflow (All Roles — Different Views)

| Role        | View behavior                                                                 |
| ----------- | ----------------------------------------------------------------------------- |
| Admin       | See all issues, read-only monitoring                                          |
| Authority   | See all issues; can approve/reject budgets, cancel reports                    |
| Accounts    | See only issues where `budgetStatus === "Approved by Higher Authority"`; can approve payment |
| Technician  | Two-queue system: **1) Incoming** (new reports to assess) and **2) Work** (budget/repair queue) |

### 9.3 Lab Assignments (Admin, Authority, Technician)

| Role        | Actions                                             |
| ----------- | --------------------------------------------------- |
| Admin       | Assign/unassign technicians to any lab              |
| Authority   | View assignments only                               |
| Technician  | View only their assigned labs                       |

### 9.4 Budgets & Payments (All Roles)

| Role        | Visible budgets                  | Actions                              |
| ----------- | -------------------------------- | ------------------------------------ |
| Admin       | All                              | View only                            |
| Authority   | All                              | Approve pending budgets              |
| Accounts    | Approved + Confirmed             | Confirm payment for approved budgets |
| Technician  | Own budgets only                 | View + publish payment concerns      |

### 9.5 User Accounts (Admin, Authority)

| Role        | Can create                          | Can delete                          |
| ----------- | ----------------------------------- | ----------------------------------- |
| Admin       | All roles                           | All except primary admin            |
| Authority   | Technician, Accounts only           | Technician, Accounts only           |

### 9.6 Public Audit Ledger (All Roles)

Displays all payment concerns / disputes. Technician identity is hidden. Each incident shows:
- Ticket ID
- Concern message
- Amount involved
- Date created

---

## 10. Notification Events

| Event                              | Recipients                     | In-app | Email |
| ---------------------------------- | ------------------------------ | ------ | ----- |
| New issue submitted                | Assigned technician            | ✅     | ✅    |
| Budget request submitted           | Authority                      | ✅     | ✅    |
| Budget approved                    | Technician, Accounts           | ✅     | ✅    |
| Budget rejected                    | Technician                     | ✅     | ✅    |
| Payment approved by Accounts       | Technician                     | ✅     | ✅    |
| Issue resolved                     | Reporter                       | ✅     | ✅    |
| Report cancelled                   | Reporter, Technician           | ✅     | ✅    |
| Payment disputed                   | Authority, Admin               | ✅     | ✅    |
| SLA breach warning (approaching)   | Assigned technician, Admin     | ✅     | ❌    |
| SLA breach (overdue)               | Authority, Admin               | ✅     | ✅    |
| New staff account created          | New staff member               | ❌     | ✅    |
| Technician removed from lab        | Affected technician            | ✅     | ✅    |

---

## 11. Validation Rules

### 11.1 Registration

| Field           | Rules                                                        |
| --------------- | ------------------------------------------------------------ |
| Full name       | Required, 2-100 characters                                   |
| Student/Staff ID| Required, alphanumeric, 6-20 characters                      |
| Email           | Required, valid email format, must end with `.edu`           |
| Department      | Required, must be one of the defined departments             |
| Role            | Required, one of `student | teacher | researcher`            |
| Password        | Required, ≥ 8 characters                                     |
| Confirm password| Must match password                                          |
| Terms agreement | Must be checked                                              |

### 11.2 Login

| Field    | Rules                                              |
| -------- | -------------------------------------------------- |
| Email    | Required, valid email format, must end with `.edu` |
| Password | Required                                           |
| Portal   | Required, one of `admin | authority | accounts | technician` |

### 11.3 Issue Submission

| Field          | Rules                                                |
| -------------- | ---------------------------------------------------- |
| Lab/Location   | Required, must be a valid lab ID                     |
| Equipment type | Required, must be from the predefined list           |
| Asset tag      | Optional, max 50 characters                          |
| Description    | Required, 10-2000 characters                         |
| Priority       | Required, one of `low | medium | high | critical`   |

### 11.4 Budget Request

| Field       | Rules                                    |
| ----------- | ---------------------------------------- |
| Amount      | Required, positive integer, ≥ 1 BDT      |
| Description | Required, 10-500 characters              |

### 11.5 Staff Account Creation

| Field    | Rules                                                        |
| -------- | ------------------------------------------------------------ |
| Name     | Required, 2-100 characters                                   |
| Email    | Required, valid format, must end with `.edu`, unique         |
| Role     | Required; Admin can set any role, Authority can only set `technician` or `accounts` |
| Lab ID   | Optional, only for technician role                           |

---

## 12. UI/UX Specifications

### 12.1 Color Palette

| Purpose         | Token / Hex                           | Usage                          |
| --------------- | ------------------------------------- | ------------------------------ |
| Brand primary   | `#d4550a`                             | CTAs, headings, accents        |
| Brand secondary | `#b83d00`                             | Hover states, gradient end     |
| Staff accent    | amber-400 (`#fbbf24`)                 | Staff portal nav, badges       |
| Background      | `#070f20` → `#0a1628`                 | Landing page gradient          |
| Dashboard bg    | slate-950 (`#020617`)                 | Dashboard background           |
| Card bg         | `rgba(255,255,255,0.03)` to `0.04`    | Cards and sections             |
| Border          | `white/10` → `white/8`               | Subtle borders                 |
| Text primary    | white                                 | Headings                       |
| Text secondary  | `white/60` → `white/45`              | Body text                      |
| Text muted      | `white/30` → `white/20`              | Labels, captions               |

### 12.2 Status Badge Colors

| Status                       | Background         | Text               |
| ---------------------------- | ------------------ | ------------------- |
| Resolved                     | `bg-green-100`     | `text-green-800`   |
| In Progress                  | `bg-blue-100`      | `text-blue-800`    |
| Under Review                 | `bg-amber-100`     | `text-amber-700`   |
| Assigned                     | `bg-violet-100`    | `text-violet-800`  |
| Budget Requested             | `bg-amber-100`     | `text-amber-800`   |
| Payment Review               | `bg-cyan-100`      | `text-cyan-800`    |
| Rejected by Higher Authority | `bg-red-100`       | `text-red-800`     |

### 12.3 Priority Colors

| Priority | Color class       |
| -------- | ----------------- |
| High     | `text-red-600`    |
| Medium   | `text-amber-600`  |
| Low      | `text-green-600`  |

### 12.4 Responsive Breakpoints

| Breakpoint | Width    | Layout changes                           |
| ---------- | -------- | ---------------------------------------- |
| sm         | 640px    | 2-column grids                           |
| md         | 768px    | Desktop nav visible, form grid layouts   |
| lg         | 1024px   | Hero 2-column, dashboard sidebar visible |
| xl         | 1280px   | 4-column grids, wider content areas      |

---

## 13. FAQ Content

| Question                                         | Answer                                                                |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| Who can submit an equipment report?               | Any registered student, lecturer, or researcher with an active university ID. Guest users may contact the lab coordinator directly. |
| How long does it take for an issue to be resolved? | Critical and high-priority issues are addressed within 24 hours. Standard issues are resolved within 3–5 working days, depending on parts availability. |
| Can I report an issue anonymously?                 | You must provide a valid university email for ticket tracking. However, your identity is kept confidential from other users in the system. |
| What if the equipment poses a safety risk?         | Mark the issue as "Safety Hazard" during submission. Do not operate the equipment and notify the lab supervisor immediately. |

---

## 14. Testing Requirements

### 14.1 Unit Tests

- Auth service: registration, login, token refresh, password reset
- Issue service: all state transitions, role-based access
- Budget service: approval flow, payment confirmation
- Validation: all input schemas
- Email masking utility

### 14.2 Integration Tests

- Full issue lifecycle: submit → assign → budget request → approve → pay → complete
- Full issue lifecycle: submit → assign → no budget → complete
- Dispute flow: payment approved → technician disputes → public ledger updated
- Account management: create technician → assign lab → remove technician → issues reassigned
- Auth flow: register → verify email → login → access protected route → refresh token

### 14.3 E2E Test Scenarios

1. Student registers, verifies email, logs in, submits issue, sees it in tracker
2. Technician logs in, sees incoming report, requests budget
3. Authority approves budget, accounts confirms payment
4. Technician completes repair, student sees "Resolved" status
5. Technician disputes payment, concern appears on public ledger
6. Admin creates new technician account and assigns to unassigned lab
7. Authority cancels an invalid report

---

## 15. Known Limitations & Future Scope

### 15.1 Current Limitations (Frontend-Only Phase)

- All data is in-memory React state (no persistence)
- No real authentication (login bypasses credential check after delay)
- No email sending
- No file attachments on issue reports
- Single-technician view hardcoded to `tech-1`
- No SSO integration (button exists but non-functional)
- Announcement banner is hardcoded

### 15.2 Future Enhancements

| Feature                        | Priority | Description                                              |
| ------------------------------ | -------- | -------------------------------------------------------- |
| File attachments               | High     | Photo/document upload on issue submission                |
| SSO integration                | High     | University SAML/OAuth2 single sign-on                    |
| Mobile app                     | Medium   | React Native or PWA for field technicians                |
| Analytics dashboard            | Medium   | Charts for resolution times, issue volume trends         |
| Equipment inventory module     | Medium   | Full asset registry with maintenance schedules           |
| Multi-language support         | Low      | Bangla + English                                         |
| Admin announcement management  | Low      | CRUD for the maintenance notice banner                   |
| Export reports                  | Low      | CSV/PDF export of issues, budgets, audit records         |
| Dark/light theme toggle        | Low      | Currently dark-only                                      |

---

## 16. Glossary

| Term               | Definition                                                                       |
| ------------------ | -------------------------------------------------------------------------------- |
| **Issue**          | An equipment problem report submitted by a student/teacher                       |
| **Ticket**         | The tracking ID assigned to an issue (e.g., TKT-2891)                            |
| **Assigned**       | Issue has been routed to the responsible technician                               |
| **Budget Request** | Technician's request for funds to repair equipment                               |
| **Higher Authority** | Senior university staff who approves/rejects budgets                           |
| **Accounts**       | Finance staff who disburses approved funds                                        |
| **Audit Ledger**   | Public log of payment disputes and financial concerns                            |
| **SLA**            | Service Level Agreement — maximum time to resolve by priority                    |
| **Pending With**   | The person or office currently responsible for the next action                    |
| **Dispute**        | A technician's public claim that approved funds were not received                |

