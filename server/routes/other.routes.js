import { memoryDb } from "../db/pool.js"

export function auditRoutes(router) {
  // GET /api/v1/audit/incidents
  router.get("/api/v1/audit/incidents", (req, res) => {
    res.json({
      data: memoryDb.tables.audit_incidents,
      total: memoryDb.tables.audit_incidents.length,
    })
  })

  // POST /api/v1/audit/incidents
  router.post("/api/v1/audit/incidents", (req, res) => {
    const { ticketId, message, amount } = req.body || {}
    if (!ticketId || !message?.trim()) {
      return res
        .status(400)
        .json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Ticket ID and description are required",
          },
        })
    }

    const incident = {
      id: memoryDb.counters.incidentSeq++,
      ticket_id: ticketId,
      message: message.trim(),
      amount: amount ? Number(amount) : null,
      reported_by_role: "Technician",
      created_at: new Date().toISOString(),
    }

    memoryDb.tables.audit_incidents.unshift(incident)

    const issue = memoryDb.tables.issues.find((i) => i.id === ticketId)
    if (issue) {
      issue.status = "Payment Disputed"
      issue.current_stage = "Payment discrepancy under public review"
      issue.pending_with = "Higher Authority"
    }

    res
      .status(201)
      .json({ message: "Dispute recorded to public ledger", incident })
  })
}

export function notificationRoutes(router) {
  // GET /api/v1/notifications
  router.get("/api/v1/notifications", (req, res) => {
    const { role, userId } = req.query || {}
    const notifs = memoryDb.tables.notifications.filter((n) => {
      if (userId && n.user_id === userId) return true
      if (role && n.target_role === role) return true
      if (!n.target_role && !n.user_id) return true
      return false
    })
    res.json({
      data: notifs,
      unreadCount: notifs.filter((n) => !n.read).length,
    })
  })

  // PATCH /api/v1/notifications/read-all
  router.patch("/api/v1/notifications/read-all", (req, res) => {
    const { role, userId } = req.query || {}
    for (const n of memoryDb.tables.notifications) {
      if (
        (role && n.target_role === role) ||
        (userId && n.user_id === userId)
      ) {
        n.read = true
      }
    }
    res.json({ message: "Notifications marked as read" })
  })
}

export function statsRoutes(router) {
  // GET /api/v1/dashboard/stats
  router.get("/api/v1/dashboard/stats", (req, res) => {
    const resolvedCount = memoryDb.tables.issues.filter(
      (i) => i.status === "Resolved",
    ).length
    const totalResolved = 2400 + resolvedCount
    const openIssues = memoryDb.tables.issues.filter(
      (i) => i.status !== "Resolved" && !i.status.includes("Rejected"),
    ).length
    const approvedTotal = memoryDb.tables.budgets
      .filter((b) => b.status !== "Pending approval")
      .reduce((sum, b) => sum + Number(b.amount || 0), 0)

    res.json({
      issuesResolvedFormatted: `${totalResolved.toLocaleString()}+`,
      issuesResolvedCount: totalResolved,
      avgResponseTime: "48 hr",
      labsSupported: memoryDb.tables.labs.length,
      satisfactionRate: "98%",
      openIssues,
      approvedBudgetTotal: approvedTotal,
      publicConcernsCount: memoryDb.tables.audit_incidents.length,
      totalStaffCount: memoryDb.tables.users.length,
      registeredLabsCount: memoryDb.tables.labs.length,
    })
  })
}

export function metaRoutes(router) {
  router.get("/api/v1/announcements", (req, res) => {
    res.json({ data: memoryDb.tables.announcements })
  })

  const equipmentTypesHandler = (req, res) => {
    res.json({
      data: [
        { icon: "🔬", label: "Microscopes" },
        { icon: "⚗️", label: "Centrifuges" },
        { icon: "💻", label: "Lab Computers" },
        { icon: "📡", label: "Oscilloscopes" },
        { icon: "🧪", label: "Spectrophotometers" },
        { icon: "🔋", label: "Power Supplies" },
        { icon: "🌡️", label: "Autoclaves" },
        { icon: "📷", label: "Imaging Systems" },
      ],
    })
  }

  router.get("/api/v1/equipment-types", equipmentTypesHandler)
  router.get("/api/v1/metadata/equipment-types", equipmentTypesHandler)

  const departmentsHandler = (req, res) => {
    res.json({
      data: [
        "Computer Science & Engineering",
        "Electrical & Electronic Engineering",
        "Mechanical Engineering",
        "Civil Engineering",
        "Physics",
        "Chemistry",
        "Biology & Biotechnology",
        "Business Administration",
        "Other",
      ],
    })
  }

  router.get("/api/v1/departments", departmentsHandler)
  router.get("/api/v1/metadata/departments", departmentsHandler)
}
