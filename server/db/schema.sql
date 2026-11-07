-- =============================================================================
-- SMART EQUIPMENT CARE SYSTEM (SECS) — POSTGRESQL SCHEMA (PERN STACK)
-- =============================================================================

-- Drop tables if re-creating
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_incidents CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS issues CASCADE;
DROP TABLE IF EXISTS labs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;

-- 1. USERS & STAFF ACCOUNTS
CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('student', 'teacher', 'researcher', 'technician', 'accounts', 'authority', 'admin')),
    department VARCHAR(255),
    student_id VARCHAR(64),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- 2. LABORATORIES
CREATE TABLE labs (
    id VARCHAR(64) PRIMARY KEY,
    room VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    technician_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_labs_technician ON labs(technician_id);

-- 3. EQUIPMENT PROBLEM TICKETS (ISSUES)
CREATE TABLE issues (
    id VARCHAR(64) PRIMARY KEY, -- Formatted: TKT-XXXX
    lab_id VARCHAR(64) REFERENCES labs(id) ON DELETE SET NULL,
    lab_name VARCHAR(255) NOT NULL,
    equipment_type VARCHAR(128) NOT NULL,
    asset_tag VARCHAR(128),
    item VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(32) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    status VARCHAR(64) NOT NULL CHECK (status IN (
        'Under Review',
        'Assigned',
        'In Progress',
        'Budget Requested',
        'Budget Rejected',
        'Payment Review',
        'Funds Approved',
        'Payment Disputed',
        'Resolved',
        'Rejected by Higher Authority'
    )),
    current_stage VARCHAR(255) NOT NULL,
    pending_with VARCHAR(255) NOT NULL,
    reporter_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    reporter_email VARCHAR(255) NOT NULL,
    reporter_name VARCHAR(255) NOT NULL,
    assigned_technician_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    budget_amount NUMERIC(12, 2),
    budget_description TEXT,
    budget_status VARCHAR(64),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_assigned_tech ON issues(assigned_technician_id);
CREATE INDEX idx_issues_lab_id ON issues(lab_id);
CREATE INDEX idx_issues_created_at ON issues(created_at DESC);

-- 4. BUDGET APPROVALS & DISBURSEMENTS
CREATE TABLE budgets (
    id VARCHAR(64) PRIMARY KEY, -- Formatted: BGT-XXXX
    ticket_id VARCHAR(64) REFERENCES issues(id) ON DELETE CASCADE,
    lab_name VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    technician_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(64) NOT NULL CHECK (status IN ('Pending approval', 'Approved', 'Payment confirmed')),
    approved_by VARCHAR(255),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_budgets_status ON budgets(status);
CREATE INDEX idx_budgets_technician ON budgets(technician_id);

-- 5. PUBLIC AUDIT LEDGER (PAYMENT DISPUTES)
CREATE TABLE audit_incidents (
    id SERIAL PRIMARY KEY,
    ticket_id VARCHAR(64) NOT NULL,
    message TEXT NOT NULL,
    amount NUMERIC(12, 2),
    reported_by_role VARCHAR(64) DEFAULT 'Technician',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_ticket ON audit_incidents(ticket_id);

-- 6. REAL-TIME NOTIFICATIONS
CREATE TABLE notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    target_role VARCHAR(64),
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    related_issue_id VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_role ON notifications(target_role);

-- 7. ANNOUNCEMENTS & MAINTENANCE BANNERS
CREATE TABLE announcements (
    id VARCHAR(64) PRIMARY KEY,
    message TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. PASSWORD RESETS
CREATE TABLE password_resets (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_resets_email ON password_resets(email);

-- 9. DEPARTMENTS (Managed dynamically by Admin)
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

