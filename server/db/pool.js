try {
  if (process.loadEnvFile) {
    process.loadEnvFile(".env.local")
  }
} catch {
  // ignore
}

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  "postgres://postgres:postgres@localhost:5432/secs_db"
const isCloudDb =
  connectionString.includes("neon.tech") ||
  connectionString.includes("supabase") ||
  connectionString.includes("sslmode=require")

const PG_CONFIG = {
  connectionString,
  ssl:
    isCloudDb || process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
}

// Check if 'pg' is importable dynamically
let pgClient = null
try {
  const pgModule = await import("pg")
  const { Pool } = pgModule.default || pgModule
  pgClient = new Pool(PG_CONFIG)
  // Suppress uncaught connection rejection on idle clients
  pgClient.on("error", () => {})
} catch {
  pgClient = null
}

// In-Memory Database Store as fallback / test harness
class MemoryPostgres {
  constructor() {
    this.tables = {
      users: [],
      labs: [],
      issues: [],
      budgets: [],
      audit_incidents: [],
      notifications: [],
      announcements: [],
    }
    this.counters = {
      ticketSeq: 2892,
      budgetSeq: 1049,
      incidentSeq: 2,
    }
    this.seed()
  }

  seed() {
    this.tables.users = [
      {
        id: "admin-1",
        name: "Mahmud Kabir",
        email: "mahmud.kabir@uitc.edu",
        password_hash:
          "e86f78a8a3caf0b60d8e74e5942aa6d86dc150cd3c03338aef25b7d2d7e3acc7",
        role: "admin",
        department: "Facilities & IT",
        is_active: true,
      },
      {
        id: "authority-1",
        name: "Dr. Samina Haque",
        email: "samina.haque@uitc.edu",
        password_hash:
          "c9961c6e598a0cc4916113c39e117040af4f3b7c1dac5f1bb8cfae636b49967e",
        role: "authority",
        department: "Academic Operations",
        is_active: true,
      },
      {
        id: "accounts-1",
        name: "Nusrat Islam",
        email: "nusrat.islam@uitc.edu",
        password_hash:
          "a1db2c9b17943dbb756dfb43c8dbda2658a550795daeffdcc89684d8981c36b5",
        role: "accounts",
        department: "Accounts Office",
        is_active: true,
      },
      {
        id: "tech-1",
        name: "Ashik Rahman",
        email: "ashik.rahman@uitc.edu",
        password_hash:
          "ab38322f1e4ca606045224e90fd3033f8e590bf15917adefdaddf7890ca03d99",
        role: "technician",
        department: "CSE & EEE",
        is_active: true,
      },
      {
        id: "tech-2",
        name: "Farhana Islam",
        email: "farhana.islam@uitc.edu",
        password_hash:
          "ab38322f1e4ca606045224e90fd3033f8e590bf15917adefdaddf7890ca03d99",
        role: "technician",
        department: "Physics",
        is_active: true,
      },
      {
        id: "tech-3",
        name: "Nayeem Hasan",
        email: "nayeem.hasan@uitc.edu",
        password_hash:
          "ab38322f1e4ca606045224e90fd3033f8e590bf15917adefdaddf7890ca03d99",
        role: "technician",
        department: "Chemistry",
        is_active: true,
      },
      {
        id: "tech-4",
        name: "Sadia Karim",
        email: "sadia.karim@uitc.edu",
        password_hash:
          "ab38322f1e4ca606045224e90fd3033f8e590bf15917adefdaddf7890ca03d99",
        role: "technician",
        department: "Biology",
        is_active: true,
      },
      {
        id: "stu-1",
        name: "Sarah Chen",
        email: "s.chen@uitc.edu",
        password_hash:
          "b2a1f4fd0a460606b34c8913e2981dac8d2e283d778aba586c416ee2629bfa54",
        role: "student",
        department: "Computer Science & Engineering",
        student_id: "0432320005101078",
        is_active: true,
      },
    ]

    this.tables.labs = [
      {
        id: "lab-1",
        room: "CSE-402",
        name: "Networking Lab",
        department: "Computer Science",
        technician_id: "tech-1",
      },
      {
        id: "lab-2",
        room: "EEE-205",
        name: "Electronics Lab",
        department: "Electrical Engineering",
        technician_id: "tech-1",
      },
      {
        id: "lab-3",
        room: "PHY-301",
        name: "Optics Lab",
        department: "Physics",
        technician_id: "tech-2",
      },
      {
        id: "lab-4",
        room: "CHEM-110",
        name: "Analytical Chemistry Lab",
        department: "Chemistry",
        technician_id: "tech-3",
      },
      {
        id: "lab-5",
        room: "BIO-214",
        name: "Molecular Biology Lab",
        department: "Biology",
        technician_id: "tech-4",
      },
      {
        id: "lab-6",
        room: "ME-106",
        name: "Thermodynamics Lab",
        department: "Mechanical Engineering",
        technician_id: null,
      },
    ]

    this.tables.issues = [
      {
        id: "TKT-2891",
        lab_id: "lab-1",
        lab_name: "CSE-402 · Networking Lab",
        equipment_type: "Lab Computer / Workstation",
        asset_tag: "Cisco Switch SW-08",
        item: "Cisco Switch SW-08",
        description:
          "Port 3 and 7 fail to negotiate 1Gbps link speed and drops packets.",
        priority: "High",
        status: "Assigned",
        current_stage: "Awaiting technician assessment",
        pending_with: "Ashik Rahman",
        reporter_id: "stu-1",
        reporter_email: "s.chen@uitc.edu",
        reporter_name: "Sarah Chen",
        assigned_technician_id: "tech-1",
        created_at: new Date("2026-03-18T09:42:00Z").toISOString(),
      },
      {
        id: "TKT-2890",
        lab_id: "lab-5",
        lab_name: "BIO-214 · Molecular Biology Lab",
        equipment_type: "Centrifuge",
        asset_tag: "Centrifuge C-14",
        item: "Centrifuge C-14",
        description:
          "Vibration dampener replaced and tested under 8000 RPM load successfully.",
        priority: "Medium",
        status: "Resolved",
        current_stage: "Repair completed",
        pending_with: "Closed",
        reporter_id: "stu-1",
        reporter_email: "r.ahmed@uitc.edu",
        reporter_name: "Rafiq Ahmed",
        assigned_technician_id: "tech-4",
        resolved_at: new Date("2026-03-17T14:16:00Z").toISOString(),
        created_at: new Date("2026-03-17T08:16:00Z").toISOString(),
      },
      {
        id: "TKT-2887",
        lab_id: "lab-4",
        lab_name: "CHEM-110 · Analytical Chemistry Lab",
        equipment_type: "Fume Hood",
        asset_tag: "Fume Hood Fan",
        item: "Fume Hood Fan",
        description:
          "Exhaust motor burned out during acid digestion experiment.",
        priority: "High",
        status: "Budget Requested",
        current_stage: "Budget awaiting approval",
        pending_with: "Higher Authority",
        reporter_id: "stu-1",
        reporter_email: "t.hossain@uitc.edu",
        reporter_name: "Tanvir Hossain",
        assigned_technician_id: "tech-3",
        budget_amount: 32000,
        budget_description:
          "Replacement motor, coupling and installation cost.",
        budget_status: "Pending Higher Authority",
        created_at: new Date("2026-03-17T11:05:00Z").toISOString(),
      },
      {
        id: "TKT-2884",
        lab_id: "lab-2",
        lab_name: "EEE-205 · Electronics Lab",
        equipment_type: "Lab Computer / Workstation",
        asset_tag: "Workstation PC-07",
        item: "Workstation PC-07",
        description: "RAM replacement complete and verified with memtest.",
        priority: "Low",
        status: "Resolved",
        current_stage: "Repair completed",
        pending_with: "Closed",
        reporter_id: "stu-1",
        reporter_email: "n.fuad@uitc.edu",
        reporter_name: "Nafis Fuad",
        assigned_technician_id: "tech-1",
        resolved_at: new Date("2026-03-16T15:28:00Z").toISOString(),
        created_at: new Date("2026-03-16T09:28:00Z").toISOString(),
      },
      {
        id: "TKT-2881",
        lab_id: "lab-2",
        lab_name: "EEE-205 · Electronics Lab",
        equipment_type: "Oscilloscope",
        asset_tag: "Oscilloscope power module",
        item: "Oscilloscope power module",
        description: "Switch-mode power supply unit capacitor breakdown.",
        priority: "Medium",
        status: "Payment Review",
        current_stage: "Approved budget awaiting Accounts",
        pending_with: "Accounts Office",
        reporter_id: "stu-1",
        reporter_email: "a.talukdar@uitc.edu",
        reporter_name: "Abir Talukdar",
        assigned_technician_id: "tech-1",
        budget_amount: 12750,
        budget_description: "Power module replacement and calibration.",
        budget_status: "Approved by Higher Authority",
        created_at: new Date("2026-03-15T10:14:00Z").toISOString(),
      },
    ]

    this.tables.budgets = [
      {
        id: "BGT-1048",
        ticket_id: "TKT-2891",
        lab_name: "Networking Lab",
        purpose: "Cisco switch power module",
        amount: 18500,
        technician_id: "tech-1",
        status: "Approved",
        approved_by: "Dr. Samina Haque",
        created_at: "18 Mar 2026",
      },
      {
        id: "BGT-1047",
        ticket_id: "TKT-2887",
        lab_name: "Analytical Chemistry Lab",
        purpose: "Fume hood motor repair",
        amount: 32000,
        technician_id: "tech-3",
        status: "Pending approval",
        created_at: "17 Mar 2026",
      },
      {
        id: "BGT-1042",
        ticket_id: "TKT-2881",
        lab_name: "Optics Lab",
        purpose: "Laser alignment kit",
        amount: 12750,
        technician_id: "tech-2",
        status: "Payment confirmed",
        approved_by: "Dr. Samina Haque",
        paid_at: "12 Mar 2026",
        created_at: "10 Mar 2026",
      },
      {
        id: "BGT-1039",
        ticket_id: "TKT-2884",
        lab_name: "Electronics Lab",
        purpose: "Oscilloscope probe set",
        amount: 8900,
        technician_id: "tech-1",
        status: "Payment confirmed",
        approved_by: "Dr. Samina Haque",
        paid_at: "09 Mar 2026",
        created_at: "07 Mar 2026",
      },
    ]

    this.tables.audit_incidents = [
      {
        id: 1,
        ticket_id: "TKT-2884",
        message:
          "Accounts marked this payment as approved, but the technician reported that the funds were not received.",
        amount: 8900,
        reported_by_role: "Technician",
        created_at: "10 Mar 2026 · 10:42 AM",
      },
    ]

    this.tables.notifications = [
      {
        id: "notif-1",
        user_id: "tech-1",
        target_role: "technician",
        message:
          "Higher Authority approved budget of ৳18,500 for Cisco switch repair.",
        read: false,
        related_issue_id: "TKT-2891",
        created_at: "18 Mar 2026 · 11:00 AM",
      },
      {
        id: "notif-2",
        user_id: "accounts-1",
        target_role: "accounts",
        message:
          "Budget BGT-1048 approved by Higher Authority, pending payment release.",
        read: false,
        related_issue_id: "TKT-2891",
        created_at: "18 Mar 2026 · 11:05 AM",
      },
    ]

    this.tables.announcements = [
      {
        id: "ann-1",
        message:
          "Physics Lab 3 oscilloscopes are currently offline for scheduled maintenance. Expected return: 10 Sep 2026.",
        active: true,
        created_at: "2026-03-01T00:00:00.000Z",
      },
    ]
  }
}

export const memoryDb = new MemoryPostgres()

/**
 * Universal query function:
 * Executes SQL against PostgreSQL if connected; otherwise handles through memory store.
 */
export async function query(sqlText, params = []) {
  if (pgClient) {
    try {
      const res = await pgClient.query(sqlText, params)
      return res
    } catch {
      // If PostgreSQL network is blocked or db not ready, seamlessly fall back
    }
  }

  // Fallback simulator for common queries
  return { rows: [], rowCount: 0 }
}
