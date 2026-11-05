import { memoryDb } from "../db/pool.js"

function maskEmail(email) {
  const [name = "", domain = ""] = (email || "").split("@")
  return name.length <= 2
    ? `${name}***@${domain}`
    : `${name.slice(0, 2)}***@${domain}`
}

export function issueRoutes(router) {
  // GET /api/v1/issues/public
  router.get("/api/v1/issues/public", (req, res) => {
    const list = memoryDb.tables.issues.map((i) => ({
      ...i,
      reporter: maskEmail(i.reporter_email),
    }))
    res.json({ data: list, total: list.length })
  })

  // GET /api/v1/issues
  router.get("/api/v1/issues", (req, res) => {
    let list = [...memoryDb.tables.issues]
    const { search, role, technicianId } = req.query || {}

    if (search) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (i) =>
          i.id.toLowerCase().includes(q) ||
          i.item.toLowerCase().includes(q) ||
          i.lab_name.toLowerCase().includes(q),
      )
    }

    if (role === "technician") {
      const tech = technicianId || req.user?.id || "tech-1"
      list = list.filter((i) => i.assigned_technician_id === tech)
    } else if (role === "accounts") {
      list = list.filter(
        (i) =>
          i.budget_status === "Approved by Higher Authority" ||
          i.budget_status === "Payment approved by Accounts",
      )
    }

    res.json({ data: list, total: list.length })
  })

  // POST /api/v1/issues
  router.post("/api/v1/issues", (req, res) => {
    const {
      labId,
      labName,
      equipmentType,
      assetTag,
      description,
      priority,
      reporterName,
      reporterEmail,
    } = req.body || {}

    if (!labId && !labName) {
      return res
        .status(400)
        .json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Lab location is required",
          },
        })
    }
    if (!equipmentType) {
      return res
        .status(400)
        .json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Equipment type is required",
          },
        })
    }
    if (!description || description.trim().length < 5) {
      return res
        .status(400)
        .json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Please provide a detailed problem description",
          },
        })
    }

    const lab = memoryDb.tables.labs.find(
      (l) => l.id === labId || `${l.room} · ${l.name}` === labName,
    )
    const assignedTechnicianId = lab?.technician_id || ""
    let pendingWith = "Lab Coordinator"
    let currentStage = "Awaiting lab review"

    if (assignedTechnicianId) {
      const tech = memoryDb.tables.users.find(
        (u) => u.id === assignedTechnicianId,
      )
      if (tech) {
        pendingWith = tech.name
        currentStage = "Awaiting technician assessment"
      }
    }

    const ticketId = `TKT-${memoryDb.counters.ticketSeq++}`
    const nowFormatted = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date())

    const newIssue = {
      id: ticketId,
      lab_id: lab?.id || labId || "lab-1",
      lab_name:
        labName ||
        (lab ? `${lab.room} · ${lab.name}` : "General University Lab"),
      equipment_type: equipmentType,
      asset_tag: assetTag || "N/A",
      item: assetTag?.trim() || equipmentType,
      description: description.trim(),
      priority: priority
        ? priority.charAt(0).toUpperCase() + priority.slice(1)
        : "Medium",
      status: assignedTechnicianId ? "Assigned" : "Under Review",
      current_stage: currentStage,
      pending_with: pendingWith,
      reporter_id: req.user?.id || "guest",
      reporter_email: reporterEmail || req.user?.email || "student@uitc.edu",
      reporter_name: reporterName || req.user?.name || "Student Reporter",
      assigned_technician_id: assignedTechnicianId,
      created_at: nowFormatted,
      updated_at: nowFormatted,
    }

    memoryDb.tables.issues.unshift(newIssue)

    if (assignedTechnicianId) {
      memoryDb.tables.notifications.unshift({
        id: `notif-${Date.now()}`,
        user_id: assignedTechnicianId,
        target_role: "technician",
        message: `New report ${ticketId} assigned for ${newIssue.lab_name}.`,
        read: false,
        created_at: nowFormatted,
      })
    }

    res
      .status(201)
      .json({ message: "Issue submitted successfully.", issue: newIssue })
  })

  // PATCH /api/v1/issues/:id/status
  router.patch("/api/v1/issues/:id/status", (req, res) => {
    const { id } = req.params
    const issue = memoryDb.tables.issues.find((i) => i.id === id)
    if (!issue) {
      return res
        .status(404)
        .json({
          error: { code: "NOT_FOUND", message: "Issue ticket not found" },
        })
    }

    const { action, budgetAmount, budgetDescription, disputeMessage } =
      req.body || {}
    const tech = memoryDb.tables.users.find(
      (u) => u.id === issue.assigned_technician_id,
    ) || { name: "Assigned Technician" }

    if (action === "confirm_no_budget") {
      issue.status = "In Progress"
      issue.current_stage = "Repair confirmed — no budget required"
      issue.pending_with = tech.name
    } else if (action === "request_budget") {
      const amount = Number(budgetAmount) || 0
      if (amount <= 0 || !budgetDescription?.trim()) {
        return res
          .status(400)
          .json({
            error: {
              code: "VALIDATION_ERROR",
              message: "Valid budget amount and description are required",
            },
          })
      }
      issue.status = "Budget Requested"
      issue.current_stage = "Budget awaiting Higher Authority decision"
      issue.pending_with = "Higher Authority"
      issue.budget_amount = amount
      issue.budget_description = budgetDescription.trim()
      issue.budget_status = "Pending Higher Authority"

      memoryDb.tables.budgets.unshift({
        id: `BGT-${memoryDb.counters.budgetSeq++}`,
        ticket_id: issue.id,
        lab_name: issue.lab_name,
        purpose: budgetDescription.trim(),
        amount,
        technician_id: issue.assigned_technician_id || "tech-1",
        status: "Pending approval",
        created_at: "Today",
      })
    } else if (action === "approve_budget") {
      issue.status = "Payment Review"
      issue.current_stage = "Budget approved — awaiting Accounts payment"
      issue.pending_with = "Accounts Office"
      issue.budget_status = "Approved by Higher Authority"

      const budget = memoryDb.tables.budgets.find((b) => b.ticket_id === id)
      if (budget) {
        budget.status = "Approved"
        budget.approved_by = "Dr. Samina Haque"
      }
    } else if (action === "reject_budget") {
      issue.status = "Budget Rejected"
      issue.current_stage = "Budget rejected by Higher Authority"
      issue.pending_with = tech.name
      issue.budget_status = "Rejected by Higher Authority"
    } else if (action === "approve_payment") {
      issue.status = "Funds Approved"
      issue.current_stage =
        "Accounts approved payment — awaiting technician confirmation"
      issue.pending_with = tech.name
      issue.budget_status = "Payment approved by Accounts"

      const budget = memoryDb.tables.budgets.find((b) => b.ticket_id === id)
      if (budget) {
        budget.status = "Payment confirmed"
        budget.paid_at = "Today"
      }
    } else if (action === "complete_repair") {
      issue.status = "Resolved"
      issue.current_stage = "Repair completed and confirmed by technician"
      issue.pending_with = "Closed"
      issue.resolved_at = new Date().toISOString()
    } else if (action === "dispute_payment") {
      issue.status = "Payment Disputed"
      issue.current_stage = "Payment discrepancy under public review"
      issue.pending_with = "Higher Authority"

      memoryDb.tables.audit_incidents.unshift({
        id: memoryDb.counters.incidentSeq++,
        ticket_id: issue.id,
        message:
          disputeMessage || "Payment discrepancy recorded by technician.",
        amount: issue.budget_amount,
        reported_by_role: "Technician",
        created_at: "Just now",
      })
    } else if (action === "cancel_report") {
      issue.status = "Rejected by Higher Authority"
      issue.current_stage = "Report cancelled by Higher Authority"
      issue.pending_with = "Closed"
    } else {
      return res
        .status(400)
        .json({
          error: {
            code: "VALIDATION_ERROR",
            message: `Unknown action: ${action}`,
          },
        })
    }

    res.json({ message: "Issue status updated successfully", issue })
  })
}
